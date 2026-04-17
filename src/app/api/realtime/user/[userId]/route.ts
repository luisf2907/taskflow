import type { NextRequest } from "next/server";

import { listenOnChannel } from "@/lib/realtime/pg-listen";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/realtime/user/<userId>
 *
 * SSE endpoint pra eventos pessoais do user — hoje: notificacoes.
 * User so pode se inscrever no proprio id (valida sessao).
 *
 * Tables emitidas: notificacoes.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Nao autenticado", { status: 401 });
  }

  // Defesa em profundidade: user so pode escutar o proprio canal
  if (user.id !== userId) {
    return new Response("Forbidden", { status: 403 });
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

      safeEnqueue(`: connected to user ${userId}\n\n`);

      let handle: Awaited<ReturnType<typeof listenOnChannel>> | null = null;
      try {
        handle = await listenOnChannel("realtime_events", (payloadRaw) => {
          let event: {
            table?: string;
            op?: string;
            id?: string;
            user_id?: string;
          };
          try {
            event = JSON.parse(payloadRaw);
          } catch {
            return;
          }

          // Filtro: so emite se e evento do proprio user
          if (event.user_id !== userId) return;

          const data = JSON.stringify({
            op: event.op,
            id: event.id,
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
