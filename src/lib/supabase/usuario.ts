"use client";

import { supabase } from "./client";
import type { User } from "@supabase/supabase-js";

/**
 * Usuario atual, lido do JWT que ja esta em memoria/localStorage.
 *
 * Por que NAO usar `supabase.auth.getUser()` aqui: apesar do nome, ele
 * SEMPRE faz um `GET /auth/v1/user` contra o servidor de auth (ver
 * `_getUser` no @supabase/auth-js). Como cada hook de dados chamava isso
 * dentro do seu proprio fetcher SWR — com chaves diferentes, entao sem
 * dedup —, um unico page load disparava 3-4 round-trips ao GoTrue so
 * pra responder "quem sou eu".
 *
 * `getSession()` le a sessao do storage local (renovando o token pelo
 * refresh token se estiver expirado) e nao faz round-trip. A validacao
 * do JWT continua acontecendo onde importa: no Postgres via RLS e no
 * `proxy.ts`/rotas de API server-side, que seguem usando `getUser()`.
 */
export async function usuarioAtual(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/** Atalho pra quando so o id importa. */
export async function usuarioAtualId(): Promise<string | null> {
  return (await usuarioAtual())?.id ?? null;
}
