import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_STORAGE_KEY } from "@/lib/supabase/storage-key";
import { jwksSupabase } from "@/lib/supabase/jwks";

const supabaseUrl =
  process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Constroi URL absoluta a partir dos headers do request.
 *
 * Problema: em Next.js standalone com HOSTNAME=0.0.0.0 no bind, usar
 * `request.url` diretamente pode produzir URLs com host 0.0.0.0 — o
 * browser recebe Location: http://0.0.0.0:3000/... e vai pro
 * endereco errado.
 *
 * Fix: usar X-Forwarded-Host (se atras de proxy) ou Host do request
 * pra construir URL que bata com o que o browser usou pra chegar ate
 * aqui.
 */
function buildRedirectUrl(request: NextRequest, pathAndQuery: string): URL {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  return new URL(pathAndQuery, `${proto}://${host}`);
}

/** O minimo que o proxy precisa saber sobre quem esta pedindo. */
interface Sessao {
  sub: string;
  app_metadata?: Record<string, unknown>;
}

/**
 * Le a sessao SEM ir a rede, quando da.
 *
 * `getUser()` e `GET /auth/v1/user` contra o GoTrue — medimos ~160 ms de RTT
 * do VPS ate o Supabase, pagos em toda request autenticada. Como o projeto
 * usa chaves assimetricas (ES256), `getClaims()` verifica a assinatura
 * localmente via WebCrypto e nao sai da maquina.
 *
 * O JWKS vem do cache de modulo — ver src/lib/supabase/jwks.ts pra entender
 * por que isso e obrigatorio e nao uma otimizacao extra.
 *
 * TRADE-OFF ACEITO: validacao local confere assinatura e expiracao, mas nao
 * consulta o servidor de auth. Um token revogado (logout em outro device,
 * senha trocada, usuario deletado) continua passando aqui ate expirar. Isso
 * e aceitavel porque o proxy e um gate de ROTEAMENTO, nao a autoridade de
 * acesso: o RLS no Postgres decide linha a linha e valida contra o banco.
 * Token revogado abre a pagina e nao le dado nenhum.
 *
 * A renovacao de sessao e preservada: `getClaims()` chama `getSession()`
 * internamente, que refaz o refresh quando o token expirou.
 */
async function lerSessao(
  supabase: SupabaseClient,
  baseUrl: string,
): Promise<Sessao | null> {
  const jwks = await jwksSupabase(baseUrl);

  if (jwks) {
    const { data } = await supabase.auth.getClaims(undefined, { jwks });
    const claims = data?.claims;
    return claims
      ? { sub: claims.sub, app_metadata: claims.app_metadata }
      : null;
  }

  // Sem JWKS utilizavel (projeto em HS256, endpoint fora do ar): degrada pro
  // round-trip de sempre. Nunca deixa passar sem validar.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { sub: user.id, app_metadata: user.app_metadata } : null;
}

export async function proxy(request: NextRequest) {
  // Early-return no edge para /api/mcp sem token valido — bloqueia bots
  // e clientes mal configurados antes de subir a function (que custa
  // CPU/memoria por invocacao). Edge middleware e ordens de magnitude
  // mais barato que function. Token real e validado dentro do handler.
  if (request.nextUrl.pathname.startsWith("/api/mcp")) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer tf_sk_")) {
      return new NextResponse(
        JSON.stringify({ error: "API key obrigatoria" }),
        {
          status: 401,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        }
      );
    }
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const { pathname } = request.nextUrl;
  const authMode = process.env.AUTH_MODE ?? "standard";

  // ─────────────────────────────────────────────────────────────────────
  // Rotas que NAO precisam saber quem e o usuario — resolvidas antes de
  // qualquer chamada ao servidor de auth.
  //
  // Isso importa porque `supabase.auth.getUser()` abaixo e um round-trip
  // de rede (GET /auth/v1/user), e o matcher deste proxy pega quase tudo:
  // toda navegacao (inclusive as RSC de client-side navigation) e todo
  // /api/* pagavam esse custo antes de a resposta comecar. A landing e a
  // pagina de precos, por exemplo, nao dependem de sessao nenhuma.
  // ─────────────────────────────────────────────────────────────────────

  // Paginas publicas (exatas)
  const publicPaths = ["/", "/pricing", "/termos", "/privacidade", "/reset-password", "/trocar-senha", "/help"];
  if (publicPaths.some((p) => pathname === p)) {
    return response;
  }

  // Convite e artigos de help sao publicos (com prefixo)
  if (pathname.startsWith("/convite/") || pathname.startsWith("/help/")) {
    return response;
  }

  // GET /api/invites/<code> e publico, e PRECISA ser: a pagina /convite/<code>
  // ja e publica e chama este endpoint no carregamento pra mostrar de qual
  // workspace e o convite. Sem esta linha o proxy devolvia 401 antes de o
  // handler rodar, o fetch da pagina falhava e o convite so funcionava pra
  // quem ja estava logado — exatamente o relato do feedback 14b4a43f.
  //
  // O handler nao le sessao: usa service_role e filtra por `ativo` e
  // `expira_em`. Quem tem o codigo ja tem o direito de ver o nome do
  // workspace, que e o que ele devolve.
  //
  // So o GET. O POST do mesmo arquivo ACEITA o convite e exige usuario
  // logado, entao continua caindo na verificacao de sessao la embaixo.
  if (request.method === "GET" && /^\/api\/invites\/[^/]+\/?$/.test(pathname)) {
    return response;
  }

  // /api/health e publico — HEALTHCHECK do Docker e monitoring externo
  if (pathname === "/api/health" || pathname.startsWith("/api/health/")) {
    return response;
  }

  // /api/auth/solo-login e publico — faz auto-login em AUTH_MODE=solo
  if (pathname.startsWith("/api/auth/solo-login")) {
    return response;
  }

  // Endpoints com auth propria (API key / HMAC): o handler valida, o proxy
  // nao tem o que decidir. Antes chegavam ate aqui so pra serem excluidos
  // do redirect de login la embaixo — pagando um getUser() a toa.
  //   /api/v1, /api/mcp       -> API keys
  //   /api/api-keys           -> gerencia as API keys (usa cookie)
  //   /api/reunioes/*/webhook -> HMAC do worker de voz (stateless, sem cookie)
  //   /auth/*                 -> callback do OAuth, ainda sem sessao
  const isVoiceWebhook = /^\/api\/reunioes\/[^/]+\/webhook\/?$/.test(pathname);
  if (
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/api/mcp") ||
    pathname.startsWith("/api/api-keys") ||
    pathname.startsWith("/auth") ||
    isVoiceWebhook
  ) {
    return response;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Daqui pra baixo a decisao depende da sessao.
  // ─────────────────────────────────────────────────────────────────────

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: { storageKey: SUPABASE_STORAGE_KEY },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const sessao = await lerSessao(supabase, supabaseUrl);

  // /api/realtime/* exige sessao — o handler valida, nao o proxy
  // (proxy nao pode ler request body nem redirect em SSE). Bloqueamos
  // aqui apenas se claramente sem auth.
  if (pathname.startsWith("/api/realtime/")) {
    if (!sessao) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return response;
  }

  // Logged-in users visiting /login go to dashboard
  if (sessao && pathname.startsWith("/login")) {
    return NextResponse.redirect(buildRedirectUrl(request, "/dashboard"));
  }

  // Forcar troca de senha no primeiro login — GoTrue app_metadata set
  // pelo CLI user:create. Leitura direto do JWT (zero query ao DB).
  // (/trocar-senha e /auth/* ja retornaram antes de chegar aqui.)
  if (
    sessao?.app_metadata?.must_change_password === true &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(buildRedirectUrl(request, "/trocar-senha"));
  }

  // AUTH_MODE=solo: auto-login silencioso se o usuario nao tem sessao.
  // Redireciona pro handler que cria/recupera sessao do SOLO_USER_EMAIL.
  if (authMode === "solo" && !sessao && !pathname.startsWith("/login")) {
    const redirectUrl = buildRedirectUrl(request, "/api/auth/solo-login");
    redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  // Protected routes: redirect to login if not authenticated.
  // Os endpoints com auth propria (/api/v1, /api/mcp, /api/api-keys,
  // webhook de voz, /auth/*) ja retornaram no bloco sem-sessao la em cima.
  if (!sessao && !pathname.startsWith("/login")) {
    return NextResponse.redirect(buildRedirectUrl(request, "/login"));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclui: _next/* (todos), arquivos com extensao (.js, .css, .png, etc), favicon, robots, sitemap, webhooks
    "/((?!_next/|.*\\.[\\w]+$|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/webhooks).*)",
  ],
};
