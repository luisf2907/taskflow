import type { JWK } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════
// Cache do JWKS em escopo de MODULO
// ═══════════════════════════════════════════════════════════════════════
// Existe por um motivo especifico e nao-obvio.
//
// `supabase.auth.getClaims()` valida o JWT localmente (sem rede) quando o
// projeto usa chaves assimetricas — ES256, no nosso caso. Mas ela cacheia o
// JWKS em `this.jwks`, inicializado NO CONSTRUTOR do GoTrueClient. E o
// proxy.ts cria um client novo a cada request.
//
// Ou seja: sem este modulo, `getClaims()` faria um fetch do JWKS por
// request — trocaria o round-trip do `getUser()` por outro round-trip, mais
// o custo de criptografia. Seria uma regressao disfarcada de otimizacao, e
// invisivel nos testes (que contam chamadas, nao round-trips).
//
// `getClaims(jwt, { jwks })` aceita um JWKS externo, que tem precedencia
// sobre o cache da instancia. O processo Node fica de pe no VPS, entao aqui
// isso vira um fetch a cada ~10 min em vez de um por request.
// ═══════════════════════════════════════════════════════════════════════

/** Mesmo TTL que a auth-js usa internamente (JWKS_TTL). */
const TTL_MS = 10 * 60 * 1000;

/** Depois de uma falha, nao martelar o endpoint a cada request. */
const BACKOFF_MS = 30 * 1000;

let cache: { keys: JWK[] } | null = null;
let renovarApos = 0;
let tentarApos = 0;
let emVoo: Promise<{ keys: JWK[] } | null> | null = null;

/**
 * JWKS do projeto Supabase, cacheado por processo.
 *
 * Retorna `null` quando nao ha JWKS utilizavel — projeto em HS256 (legado),
 * endpoint fora do ar, resposta malformada. Quem chama deve degradar pro
 * `getUser()` nesse caso, nunca deixar passar sem validar.
 */
export async function jwksSupabase(
  baseUrl: string,
): Promise<{ keys: JWK[] } | null> {
  const agora = Date.now();

  if (cache && agora < renovarApos) return cache;
  // Em backoff apos falha: devolve o que houver. Cache velho e melhor que
  // martelar o endpoint; `null` faz o chamador cair no getUser().
  if (agora < tentarApos) return cache;
  if (emVoo) return emVoo;

  emVoo = buscar(baseUrl).finally(() => {
    emVoo = null;
  });
  return emVoo;
}

async function buscar(baseUrl: string): Promise<{ keys: JWK[] } | null> {
  try {
    const res = await fetch(`${baseUrl}/auth/v1/.well-known/jwks.json`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const body = (await res.json()) as { keys?: unknown };
    const keys = body?.keys;
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error("JWKS sem chaves");
    }

    cache = { keys: keys as JWK[] };
    renovarApos = Date.now() + TTL_MS;
    return cache;
  } catch (erro) {
    tentarApos = Date.now() + BACKOFF_MS;
    // Chave rotacionada e raro; endpoint indisponivel por instantes nao e.
    // Se ja tinhamos um JWKS, seguir com ele e mais seguro que degradar.
    if (!cache) {
      console.warn(
        "[jwks] indisponivel, proxy vai degradar para getUser():",
        erro instanceof Error ? erro.message : erro,
      );
    }
    return cache;
  }
}

/** Reset entre testes. Nao usar em runtime. */
export function _resetJwksCache() {
  cache = null;
  renovarApos = 0;
  tentarApos = 0;
  emVoo = null;
}
