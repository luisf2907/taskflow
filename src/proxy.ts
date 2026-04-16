import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SUPABASE_STORAGE_KEY } from "@/lib/supabase/storage-key";

const supabaseUrl =
  process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

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

  const { pathname } = request.nextUrl;
  const authMode = process.env.AUTH_MODE ?? "standard";

  // Public pages (no auth required)
  const publicPaths = ["/", "/pricing", "/termos", "/privacidade", "/reset-password", "/help"];
  // Convite e help articles sao publicos (com prefixo)
  if (pathname.startsWith("/convite/") || pathname.startsWith("/help/")) return response;
  if (publicPaths.some((p) => pathname === p)) {
    return response;
  }

  // /api/health e publico — HEALTHCHECK do Docker e monitoring externo
  if (pathname === "/api/health" || pathname.startsWith("/api/health/")) {
    return response;
  }

  // /api/realtime/* exige sessao — o handler valida, nao o proxy
  // (proxy nao pode ler request body nem redirect em SSE). Bloqueamos
  // aqui apenas se claramente sem auth.
  if (pathname.startsWith("/api/realtime/")) {
    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    return response;
  }

  // /api/auth/solo-login e publico — faz auto-login em AUTH_MODE=solo
  if (pathname.startsWith("/api/auth/solo-login")) {
    return response;
  }

  // Logged-in users visiting /login go to dashboard
  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // AUTH_MODE=solo: auto-login silencioso se o usuario nao tem sessao.
  // Redireciona pro handler que cria/recupera sessao do SOLO_USER_EMAIL.
  if (authMode === "solo" && !user && !pathname.startsWith("/login")) {
    const redirectUrl = new URL("/api/auth/solo-login", request.url);
    redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  // Protected routes: redirect to login if not authenticated
  // Endpoints com auth propria (API keys, HMAC, etc) precisam bypass do redirect:
  //   /api/v1, /api/mcp         -> API keys
  //   /api/api-keys             -> gerencia as API keys (usa cookie)
  //   /api/reunioes/*/webhook   -> HMAC do worker de voz (stateless, sem cookie)
  const isVoiceWebhook = /^\/api\/reunioes\/[^/]+\/webhook\/?$/.test(pathname);
  if (
    !user &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/api/v1") &&
    !pathname.startsWith("/api/mcp") &&
    !pathname.startsWith("/api/api-keys") &&
    !isVoiceWebhook
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Exclui: _next/* (todos), arquivos com extensao (.js, .css, .png, etc), favicon, robots, sitemap, webhooks
    "/((?!_next/|.*\\.[\\w]+$|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/webhooks).*)",
  ],
};
