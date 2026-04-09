import { mutate as globalMutate } from "swr";

const DEBOUNCE_DELAY = 300;

/**
 * Debounced SWR mutate para batch de eventos realtime rapidos.
 * Compartilhado entre hooks que usam Supabase Realtime.
 *
 * Inclui BroadcastChannel para sincronizar invalidacoes entre tabs
 * do mesmo browser (cada tab tem instancia SWR separada).
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

// Cross-tab sync via BroadcastChannel (fallback silencioso se nao suportado)
let bc: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  bc = new BroadcastChannel("taskflow-swr-sync");
  bc.onmessage = (event: MessageEvent<string>) => {
    // Recebeu invalidacao de outra tab — revalidar localmente
    if (typeof event.data === "string") {
      globalMutate(event.data);
    }
  };
}

export function debouncedMutate(key: string, delay = DEBOUNCE_DELAY) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    globalMutate(key);
    // Notificar outras tabs
    try { bc?.postMessage(key); } catch { /* tab fechada */ }
  }, delay));
}
