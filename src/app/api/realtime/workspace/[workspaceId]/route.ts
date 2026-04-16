import type { NextRequest } from "next/server";

import { listenOnChannel } from "@/lib/realtime/pg-listen";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/realtime/workspace/<workspaceId>
 *
 * SSE endpoint pra eventos de workspace (quadros, atividades, cartoes
 * no backlog). Analogo a /board/* mas escopo mais amplo.
 *
 * Tables emitidas: quadros, atividades, cartoes (so com workspace_id
 * batendo).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Nao autenticado", { status: 401 });
  }

  // Valida que user e membro do workspace
  const { count } = await supabase
    .from("workspace_usuarios")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id);
  if (!count || count === 0) {
    return new Response("Workspace nao encontrado ou sem acesso", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      safeEnqueue(`: connected to workspace ${workspaceId}\n\n`);

      let handle: Awaited<ReturnType<typeof listenOnChannel>> | null = null;
      try {
        handle = await listenOnChannel("realtime_events", (payloadRaw) => {
          let event: {
            table?: string;
            op?: string;
            id?: string;
            workspace_id?: string;
            quadro_id?: string;
          };
          try {
            event = JSON.parse(payloadRaw);
          } catch {
            return;
          }

          // Filtro por workspace
          if (event.workspace_id !== workspaceId) return;

          const data = JSON.stringify({
            op: event.op,
            id: event.id,
            quadro_id: event.quadro_id,
          });
          safeEnqueue(`event: ${event.table}\ndata: ${data}\n\n`);
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "pg listen error";
        safeEnqueue(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
        closed = true;
        controller.close();
        return;
      }

      const heartbeat = setInterval(() => {
        safeEnqueue(`: heartbeat ${Date.now()}\n\n`);
      }, 30_000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        handle?.unlisten().catch(() => {});
        try {
          controller.close();
        } catch {
          // ja fechado
        }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
