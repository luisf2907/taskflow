import { authenticateApiKey } from "@/lib/mcp-auth";
import { applyRateLimit } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { tools } from "./_tools";

// =============================================
// JSON-RPC HANDLER (MCP Protocol)
// =============================================

const JsonRpcSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

function jsonRpcResponse(id: string | number | undefined, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

function jsonRpcError(
  id: string | number | undefined,
  code: number,
  message: string
) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, "mcp", {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  // Auth
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer tf_sk_")) {
    return NextResponse.json(
      { error: "API key obrigatoria. Use Authorization: Bearer tf_sk_..." },
      { status: 401 }
    );
  }

  const authResult = await authenticateApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  const apiKey = authHeader.slice(7).trim();
  const baseUrl = new URL(request.url).origin;

  // Parse JSON-RPC
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      jsonRpcError(undefined, -32700, "Parse error"),
      { status: 400 }
    );
  }

  const parsed = JsonRpcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      jsonRpcError(undefined, -32600, "Invalid Request"),
      { status: 400 }
    );
  }

  const { id, method, params } = parsed.data;

  // ─── MCP Protocol Methods ───

  if (method === "initialize") {
    const sessionId = crypto.randomUUID();
    const res = NextResponse.json(
      jsonRpcResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "Taskflow", version: "1.0.0" },
      })
    );
    res.headers.set("Mcp-Session-Id", sessionId);
    return res;
  }

  // notifications have no id — return 202 Accepted (no body)
  if (
    method === "notifications/initialized" ||
    method.startsWith("notifications/")
  ) {
    return new NextResponse(null, { status: 202 });
  }

  if (method === "tools/list") {
    return NextResponse.json(
      jsonRpcResponse(id, {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      })
    );
  }

  if (method === "tools/call") {
    const toolName = (params as Record<string, unknown>)?.name as string;
    const toolArgs = ((params as Record<string, unknown>)?.arguments ||
      {}) as Record<string, unknown>;

    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
      return NextResponse.json(
        jsonRpcResponse(id, {
          content: [
            { type: "text", text: `Tool '${toolName}' nao encontrada` },
          ],
          isError: true,
        })
      );
    }

    try {
      const result = await tool.handler(toolArgs, apiKey, baseUrl);
      return NextResponse.json(
        jsonRpcResponse(id, {
          content: [{ type: "text", text: result }],
        })
      );
    } catch (err) {
      return NextResponse.json(
        jsonRpcResponse(id, {
          content: [
            {
              type: "text",
              text: `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
            },
          ],
          isError: true,
        })
      );
    }
  }

  return NextResponse.json(
    jsonRpcError(id, -32601, `Method '${method}' not found`)
  );
}

// GET — SSE endpoint (required by mcp-remote for session setup)
export async function GET(request: NextRequest) {
  const accept = request.headers.get("accept") || "";

  // If client wants SSE, return event stream
  if (accept.includes("text/event-stream")) {
    const stream = new ReadableStream({
      start(controller) {
        // Send a keepalive comment
        controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Otherwise return server info
  return NextResponse.json({
    name: "Taskflow MCP Server",
    version: "1.0.0",
    description: "Gerencie projetos, cards, sprints e GitHub via Claude Code",
    tools: tools.map((t) => t.name),
    instructions: "Configure com: Authorization: Bearer tf_sk_...",
  });
}

// DELETE — close session
export async function DELETE() {
  return new NextResponse(null, { status: 200 });
}
