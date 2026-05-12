/**
 * Helper para enviar eventos custom ao Umami.
 *
 * Uso server-side (API routes, RSC, server actions):
 *   import { trackEvent } from "@/lib/umami";
 *   await trackEvent("mcp_request", { method: "tools/list" });
 *
 * Uso client-side: o script do Umami expoe window.umami globalmente.
 *   if (typeof window !== "undefined" && window.umami) {
 *     window.umami.track("card_created", { workspace_id: "..." });
 *   }
 *
 * Se as envs nao estiverem setadas (ex: dev local), a funcao vira no-op.
 */

const UMAMI_HOST = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.replace(
  "/script.js",
  ""
);
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

interface UmamiEventPayload {
  type: "event";
  payload: {
    website: string;
    name: string;
    data?: Record<string, unknown>;
    url?: string;
    hostname?: string;
    language?: string;
    screen?: string;
  };
}

/**
 * Envia evento custom ao Umami via API REST (server-side).
 *
 * Nao bloqueia em caso de erro — analytics nao deve quebrar a request.
 * Fire-and-forget.
 */
export async function trackEvent(
  eventName: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!UMAMI_HOST || !UMAMI_WEBSITE_ID) return;

  const payload: UmamiEventPayload = {
    type: "event",
    payload: {
      website: UMAMI_WEBSITE_ID,
      name: eventName,
      data,
      hostname:
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "") ?? "",
    },
  };

  try {
    // /api/send e o endpoint REST do Umami pra eventos server-side
    await fetch(`${UMAMI_HOST}/api/send`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "taskflow-server",
      },
      body: JSON.stringify(payload),
      // Nunca espera resposta — analytics nao pode atrasar a request
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Silencioso de proposito — falha de analytics nao deve poluir logs
  }
}

/**
 * Helper de tipagem para a API client-side do Umami.
 * O script global injeta window.umami quando carrega.
 */
declare global {
  interface Window {
    umami?: {
      track: (
        eventName: string,
        data?: Record<string, unknown>
      ) => void;
      identify: (data: Record<string, unknown>) => void;
    };
  }
}

/**
 * Versao client-side conveniente — chama window.umami.track se disponivel.
 * Use em hooks/components React.
 */
export function trackClientEvent(
  eventName: string,
  data?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  if (!window.umami) return;
  try {
    window.umami.track(eventName, data);
  } catch {
    // Silencioso
  }
}
