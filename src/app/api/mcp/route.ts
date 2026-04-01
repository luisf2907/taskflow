import { authenticateApiKey } from "@/lib/mcp-auth";
import { applyRateLimit } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// =============================================
// HELPER: chamar API v1 interna
// =============================================

async function callV1(
  method: string,
  path: string,
  apiKey: string,
  baseUrl: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `${baseUrl}/api/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}

// =============================================
// TOOL DEFINITIONS
// =============================================

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (params: Record<string, unknown>, apiKey: string, baseUrl: string) => Promise<string>;
}

const tools: ToolDef[] = [
  // ─── WORKSPACES ───
  {
    name: "list_workspaces",
    description: "Listar workspaces acessiveis com esta API key",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async (_, apiKey, baseUrl) => {
      const res = await callV1("GET", "workspaces", apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },

  // ─── CARDS ───
  {
    name: "list_cards",
    description: "Listar cards do workspace. Filtros: status (backlog|sprint|all), sprint_id",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["backlog", "sprint", "all"], description: "Filtrar por status" },
        sprint_id: { type: "string", description: "ID da sprint para filtrar" },
      },
    },
    handler: async (params, apiKey, baseUrl) => {
      const qs = new URLSearchParams();
      if (params.status && params.status !== "all") qs.set("status", params.status as string);
      if (params.sprint_id) qs.set("sprint_id", params.sprint_id as string);
      const q = qs.toString();
      const res = await callV1("GET", `cards${q ? "?" + q : ""}`, apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "get_card",
    description: "Ver detalhes de um card (descricao, checklists, etiquetas)",
    inputSchema: {
      type: "object",
      properties: { card_id: { type: "string", description: "ID do card" } },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("GET", `cards/${params.card_id}`, apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "create_card",
    description: "Criar um novo card no backlog. Use esta tool diretamente para criar cards — voce mesmo define titulo, descricao, etiquetas e checklists. NAO use generate_cards ou enhance_card para isso, essas sao para o usuario do app usar via IA Gemini.",
    inputSchema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Titulo do card" },
        descricao: { type: "string", description: "Descricao do card (user story, contexto tecnico)" },
        peso: { type: "number", description: "Story points (fibonacci: 1,2,3,5,8,13,21)" },
        etiquetas: {
          type: "array",
          items: { type: "string" },
          description: "Nomes de etiquetas (ex: ['bug', 'frontend', 'urgente']). Cria automaticamente se nao existir no workspace.",
        },
        checklists: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string", description: "Titulo do checklist (ex: 'Criterios de Aceitacao')" },
              itens: { type: "array", items: { type: "string" }, description: "Itens do checklist" },
            },
            required: ["titulo", "itens"],
          },
          description: "Checklists com itens (ex: criterios de aceitacao, tarefas tecnicas)",
        },
      },
      required: ["titulo"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "cards", apiKey, baseUrl, params);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "update_card",
    description: "Atualizar campos de um card existente. Voce pode adicionar etiquetas por nome e checklists com itens diretamente — nao precisa usar enhance_card para isso.",
    inputSchema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "ID do card" },
        titulo: { type: "string", description: "Novo titulo" },
        descricao: { type: "string", description: "Nova descricao" },
        peso: { type: "number", description: "Novos story points" },
        etiquetas: {
          type: "array",
          items: { type: "string" },
          description: "Nomes de etiquetas para adicionar (cria se nao existir)",
        },
        checklists: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              itens: { type: "array", items: { type: "string" } },
            },
            required: ["titulo", "itens"],
          },
          description: "Checklists para adicionar ao card",
        },
      },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const { card_id, ...campos } = params;
      const res = await callV1("PATCH", `cards/${card_id}`, apiKey, baseUrl, campos);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "move_card",
    description: "Mover card entre colunas, sprints ou backlog",
    inputSchema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "ID do card" },
        coluna_id: { type: "string", description: "ID da coluna destino" },
        sprint_id: { type: "string", description: "ID da sprint destino" },
        backlog: { type: "boolean", description: "Mover de volta pro backlog" },
      },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const { card_id, ...body } = params;
      const res = await callV1("POST", `cards/${card_id}/move`, apiKey, baseUrl, body);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "delete_card",
    description: "Excluir um card",
    inputSchema: {
      type: "object",
      properties: { card_id: { type: "string", description: "ID do card" } },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      await callV1("DELETE", `cards/${params.card_id}`, apiKey, baseUrl);
      return "Card excluido com sucesso";
    },
  },

  // ─── SPRINTS ───
  {
    name: "list_sprints",
    description: "Listar sprints do workspace",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async (_, apiKey, baseUrl) => {
      const res = await callV1("GET", "sprints", apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "get_sprint_summary",
    description: "Resumo da sprint: cards, pontos planejados vs entregues, cards por coluna",
    inputSchema: {
      type: "object",
      properties: { sprint_id: { type: "string", description: "ID da sprint" } },
      required: ["sprint_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("GET", `sprints/${params.sprint_id}/summary`, apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "create_sprint",
    description: "Criar nova sprint",
    inputSchema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome da sprint" },
        data_inicio: { type: "string", description: "Data inicio (YYYY-MM-DD)" },
        data_fim: { type: "string", description: "Data fim (YYYY-MM-DD)" },
        meta: { type: "string", description: "Objetivo da sprint" },
      },
      required: ["nome"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "sprints", apiKey, baseUrl, params);
      return JSON.stringify(res.data, null, 2);
    },
  },

  // ─── GITHUB ───
  {
    name: "list_repos",
    description: "Listar repositorios GitHub conectados ao workspace",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async (_, apiKey, baseUrl) => {
      const res = await callV1("GET", "repos", apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "list_prs",
    description: "Listar Pull Requests de um repositorio",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Dono do repo" },
        repo: { type: "string", description: "Nome do repo" },
      },
      required: ["owner", "repo"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("GET", `repos/${params.owner}/${params.repo}/prs`, apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "list_branches",
    description: "Listar branches de um repositorio",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Dono do repo" },
        repo: { type: "string", description: "Nome do repo" },
      },
      required: ["owner", "repo"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("GET", `repos/${params.owner}/${params.repo}/branches`, apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "create_pr",
    description: "Abrir Pull Request no GitHub, opcionalmente vinculado a um card",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repo (ex: luisf2907/taskflow)" },
        head: { type: "string", description: "Branch de origem" },
        base: { type: "string", description: "Branch destino" },
        title: { type: "string", description: "Titulo do PR" },
        body: { type: "string", description: "Descricao do PR" },
        card_id: { type: "string", description: "ID do card para vincular" },
      },
      required: ["repo", "head", "base", "title"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "prs", apiKey, baseUrl, params);
      return JSON.stringify(res.data, null, 2);
    },
  },

  // ─── FLUXO INTEGRADO ───
  {
    name: "start_work",
    description: "Iniciar trabalho em um card: cria branch no GitHub e move para Em Progresso",
    inputSchema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "ID do card" },
        repo: { type: "string", description: "Repo para criar branch" },
        base: { type: "string", description: "Branch base (padrao: main)" },
      },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const { card_id, ...body } = params;
      const res = await callV1("POST", `cards/${card_id}/start-work`, apiKey, baseUrl, body);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "finish_work",
    description: "Finalizar trabalho: abre PR no GitHub e move card para Em Review",
    inputSchema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "ID do card" },
        repo: { type: "string", description: "Repo" },
        base: { type: "string", description: "Branch destino do PR (padrao: main)" },
      },
      required: ["card_id", "repo"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const { card_id, ...body } = params;
      const res = await callV1("POST", `cards/${card_id}/finish-work`, apiKey, baseUrl, body);
      return JSON.stringify(res.data, null, 2);
    },
  },

  // ─── IA ───
  {
    name: "generate_cards",
    description: "Usar IA Gemini para quebrar texto livre em multiplos cards (uso interno do app). Prefira criar cards diretamente com create_card se voce ja sabe os detalhes.",
    inputSchema: {
      type: "object",
      properties: { texto: { type: "string", description: "Texto descrevendo as tarefas" } },
      required: ["texto"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "ai/generate-cards", apiKey, baseUrl, params);
      return JSON.stringify(res, null, 2);
    },
  },
  {
    name: "enhance_card",
    description: "Usar IA Gemini para melhorar um card existente (uso interno do app). Prefira update_card se voce mesmo quer editar o card.",
    inputSchema: {
      type: "object",
      properties: { card_id: { type: "string", description: "ID do card" } },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "ai/enhance-card", apiKey, baseUrl, { cardId: params.card_id });
      return JSON.stringify(res, null, 2);
    },
  },
];

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

function jsonRpcError(id: string | number | undefined, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, "mcp", { maxRequests: 60, windowMs: 60_000 });
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
    return NextResponse.json(jsonRpcError(undefined, -32700, "Parse error"), { status: 400 });
  }

  const parsed = JsonRpcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(jsonRpcError(undefined, -32600, "Invalid Request"), { status: 400 });
  }

  const { id, method, params } = parsed.data;

  // ─── MCP Protocol Methods ───

  if (method === "initialize") {
    const sessionId = crypto.randomUUID();
    const res = NextResponse.json(jsonRpcResponse(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "Taskflow", version: "1.0.0" },
    }));
    res.headers.set("Mcp-Session-Id", sessionId);
    return res;
  }

  // notifications have no id — return 202 Accepted (no body)
  if (method === "notifications/initialized" || method.startsWith("notifications/")) {
    return new NextResponse(null, { status: 202 });
  }

  if (method === "tools/list") {
    return NextResponse.json(jsonRpcResponse(id, {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }));
  }

  if (method === "tools/call") {
    const toolName = (params as Record<string, unknown>)?.name as string;
    const toolArgs = ((params as Record<string, unknown>)?.arguments || {}) as Record<string, unknown>;

    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
      return NextResponse.json(jsonRpcResponse(id, {
        content: [{ type: "text", text: `Tool '${toolName}' nao encontrada` }],
        isError: true,
      }));
    }

    try {
      const result = await tool.handler(toolArgs, apiKey, baseUrl);
      return NextResponse.json(jsonRpcResponse(id, {
        content: [{ type: "text", text: result }],
      }));
    } catch (err) {
      return NextResponse.json(jsonRpcResponse(id, {
        content: [{ type: "text", text: `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}` }],
        isError: true,
      }));
    }
  }

  return NextResponse.json(jsonRpcError(id, -32601, `Method '${method}' not found`));
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
        "Connection": "keep-alive",
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
