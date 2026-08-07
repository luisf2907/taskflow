import { createBrowserClient } from "@supabase/ssr";
// `env-publico` e nao `env`: este arquivo e a porta de entrada do Supabase no
// navegador (29 componentes de cliente o importam), e `@/lib/env` arrasta o
// zod junto por causa do schema de servidor que mora la. Ver o cabecalho de
// env-publico.ts.
import { publicEnv } from "@/lib/env-publico";
import { SUPABASE_STORAGE_KEY } from "./storage-key";

export const supabase = createBrowserClient(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: { storageKey: SUPABASE_STORAGE_KEY },
  }
);
