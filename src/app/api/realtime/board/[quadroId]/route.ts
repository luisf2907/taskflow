import type { NextRequest } from "next/server";

import { listenOnChannel } from "@/lib/realtime/pg-listen";
import { createServerClient } from "@/lib/supabase/server";
import { applyRateLimitAsync } from "@/lib/api-utils";

/**
 * GET /api/realtime/board/<quadroId>
 *
 * SSE endpoint que stream eventos realtime pra um quadro especifico.
 * Substitui Supabase Realtime no perfil solo/team (zero container
 * Elixir/Phoenix).
 *
 * Fluxo:
 *   1. Valida sessao (cookie)
 *   2. Valida que user e membro do workspace do quadro (RLS)
 *   3. Abre LISTEN realtime_events no Postgres
 *   4. Pra cada notify, filtra por quadro e envia como SSE event
 *   5. Heartbeat de comentario a cada 30s pra evitar timeout
 *   6. Cleanup no abort signal
 *
 * Formato SSE:
 *   event: <table>
 *   data: {"op":"UPDATE","id":"xxx"}
 *
 * Tables emitidas: cartoes, colunas, comentarios, atividades.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ quadroId: string }> },
) {
  const { quadroId } = await context.params;

  // Rate limit: 10 conexoes SSE/min por IP — multiplas abas legitimas OK
  const limited = await applyRateLimitAsync(request, "realtime-board", { maxRequests: 10 });
  if (limited) return limited;

  // ───── Auth + autorizacao ─────
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Nao autenticado", { status: 401 });
  }

  // RLS deixa a query passar so se user e membro do workspace do quadro
  const { data: quadro, error } = await supabase
    .from("quadros")
    .select("id, workspace_id")
    .eq("id", quadroId)
    .maybeSingle();
  if (error || !quadro) {
    return new Response("Quadro nao encontrado ou sem acesso", { status: 404 });
  }

  const { workspace_id: workspaceId } = quadro;

  // ───── Stream SSE ─────
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // stream pode ja estar fechado
          closed = true;
        }
      };

      // Mensagem inicial
      safeEnqueue(`: connected to board ${quadroId}\n\n`);

      // ───── LISTEN + filtro ─────
      let handle: Awaited<ReturnType<typeof listenOnChannel>> | null = null;
      try {
        handle = await listenOnChannel("realtime_events", (payloadRaw) => {
          let event: {
            table?: string;
            op?: string;
            id?: string;
            quadro_id?: string;
            workspace_id?: string;
            cartao_id?: string;
            coluna_id?: string;
          };
          try {
            event = JSON.parse(payloadRaw);
          } catch {
            return;
          }

          // Filtro por escopo: quadro-level eventos
          const inThisBoard =
            event.quadro_id === quadroId ||
            (event.table === "cartoes" && event.workspace_id === workspaceId);
          // Nota: "cartoes" nao tem quadro_id direto (tem coluna_id).
          // Filtrar por workspace_id e proxima melhor aproximacao — o
          // client vai chamar debouncedMutate com a key do quadro e o SWR
          // cache resolve. Idealmente, checariamos se coluna_id pertence
          // ao quadro mas isso exige outra query — nao vale o custo.

          if (!inThisBoard) return;

          // Emite SSE event nomeado por tabela (client escuta cada um)
          const data = JSON.stringify({
            op: event.op,
            id: event.id,
            coluna_id: event.coluna_id,
            cartao_id: event.cartao_id,
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

      // ───── Heartbeat ─────
      const heartbeat = setInterval(() => {
        safeEnqueue(`: heartbeat ${Date.now()}\n\n`);
      }, 30_000);

      // ───── Cleanup quando client desconecta ─────
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
      "X-Accel-Buffering": "no", // desabilita buffering no nginx
      Connection: "keep-alive",
    },
  });
}
