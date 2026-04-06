import { mutate as globalMutate } from "swr";

const DEBOUNCE_DELAY = 300;

/**
 * Debounced SWR mutate para batch de eventos realtime rapidos.
 * Compartilhado entre hooks que usam Supabase Realtime.
 */
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function debouncedMutate(key: string, delay = DEBOUNCE_DELAY) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    globalMutate(key);
  }, delay));
}
