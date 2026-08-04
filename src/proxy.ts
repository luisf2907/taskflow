import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SUPABASE_STORAGE_KEY } from "@/lib/supabase/storage-key";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /api/realtime/* exige sessao — o handler valida, nao o proxy
  // (proxy nao pode ler request body nem redirect em SSE). Bloqueamos
  // aqui apenas se claramente sem auth.
  if (pathname.startsWith("/api/realtime/")) {
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return response;
  }

  // Logged-in users visiting /login go to dashboard
  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(buildRedirectUrl(request, "/dashboard"));
  }

  // Forcar troca de senha no primeiro login — GoTrue app_metadata set
  // pelo CLI user:create. Leitura direto do JWT (zero query ao DB).
  // (/trocar-senha e /auth/* ja retornaram antes de chegar aqui.)
  if (
    user &&
    (user as { app_metadata?: Record<string, unknown> }).app_metadata?.must_change_password === true &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(buildRedirectUrl(request, "/trocar-senha"));
  }

  // AUTH_MODE=solo: auto-login silencioso se o usuario nao tem sessao.
  // Redireciona pro handler que cria/recupera sessao do SOLO_USER_EMAIL.
  if (authMode === "solo" && !user && !pathname.startsWith("/login")) {
    const redirectUrl = buildRedirectUrl(request, "/api/auth/solo-login");
    redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  // Protected routes: redirect to login if not authenticated.
  // Os endpoints com auth propria (/api/v1, /api/mcp, /api/api-keys,
  // webhook de voz, /auth/*) ja retornaram no bloco sem-sessao la em cima.
  if (!user && !pathname.startsWith("/login")) {
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
