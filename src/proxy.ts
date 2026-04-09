import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
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

  // Public pages (no auth required)
  const publicPaths = ["/", "/pricing", "/termos", "/privacidade", "/reset-password", "/help"];
  // Convite e help articles sao publicos (com prefixo)
  if (pathname.startsWith("/convite/") || pathname.startsWith("/help/")) return response;
  if (publicPaths.some((p) => pathname === p)) {
    return response;
  }

  // Logged-in users visiting /login go to dashboard
  if (user && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
