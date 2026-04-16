import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import { features } from "@/lib/features";
import { SUPABASE_STORAGE_KEY } from "./storage-key";

// DEBUG temporario — ajuda diagnosticar se o build pegou
// NEXT_PUBLIC_REALTIME_DRIVER corretamente. Remover depois de
// confirmar que self-hosted funciona.
if (typeof window !== "undefined") {
  console.log("[taskflow] realtime driver:", features.realtime.driver);
}

export const supabase = createBrowserClient(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: { storageKey: SUPABASE_STORAGE_KEY },
    // Em drivers que nao sao supabase, queremos evitar que o Realtime
    // client tente conectar sozinho. O SDK nao tem "realtime: off" nativo,
    // mas setamos eventsPerSecond baixissimo como sinal (SDK nao cria
    // channel ate alguem chamar .channel() — mesmo assim, o nosso adapter
    // em use-realtime.ts ja nao chama .channel() quando driver !== supabase).
  }
);
