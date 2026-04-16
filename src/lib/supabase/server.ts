import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";

/**
 * No self-hosted, NEXT_PUBLIC_SUPABASE_URL e a URL "externa" (ex: http://localhost:8000)
 * que o browser usa pra bater no nginx gateway. Dentro do container app isso nao
 * resolve — "localhost" = container app. Server-side usamos SUPABASE_INTERNAL_URL
 * (ex: http://nginx:8000, hostname da rede docker). Em cloud, as duas sao iguais.
 */
function getInternalUrl(env: ReturnType<typeof getServerEnv>): string {
  return env.SUPABASE_INTERNAL_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
}

export async function createServerClient() {
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createSSRServerClient(
    getInternalUrl(env),
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore errors in Server Components (read-only cookies)
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  const env = getServerEnv();
  return createClient(
    getInternalUrl(env),
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
