import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import { SUPABASE_STORAGE_KEY } from "./storage-key";

export const supabase = createBrowserClient(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: { storageKey: SUPABASE_STORAGE_KEY },
  }
);
