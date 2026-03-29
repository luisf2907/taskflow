import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

export const supabase = createBrowserClient(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
