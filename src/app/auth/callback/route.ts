import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function sanitizeRedirectPath(next: string | null): string {
  if (!next) return "/dashboard";
  // Prevent open redirect: only allow relative paths starting with /
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

/**
 * Constroi URL absoluta usando Host do browser (nao request.url que
 * dentro do container resolve pra 0.0.0.0:3000).
 */
function buildUrl(request: NextRequest, pathAndQuery: string): URL {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  return new URL(pathAndQuery, `${proto}://${host}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next"));
  const errorParam = searchParams.get("error_description") || searchParams.get("error");

  // Se o Supabase retornou erro (ex: token expirado), redirecionar com mensagem amigavel
  if (errorParam) {
    const msg = errorParam.includes("expired")
      ? "Link expirado. Solicite um novo."
      : "Erro na autenticacao. Tente novamente.";
    return NextResponse.redirect(buildUrl(request, `/login?error=${encodeURIComponent(msg)}`));
  }

  if (!code) {
    return NextResponse.redirect(buildUrl(request, "/login?error=Link+invalido.+Solicite+um+novo."));
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    // PKCE flow: se o link de verificacao abriu em contexto diferente do
    // browser onde o signup aconteceu, o code_verifier nao existe e o
    // exchange falha. Mas o email JA FOI verificado pelo GoTrue no /verify.
    // Em vez de mostrar erro, redireciona pro login com mensagem positiva.
    const isPkceError =
      error?.message?.includes("code verifier") ||
      error?.message?.includes("flow state") ||
      error?.message?.includes("code challenge");

    if (isPkceError || searchParams.get("type") === "signup") {
      return NextResponse.redirect(
        buildUrl(request, `/login?success=${encodeURIComponent("Email verificado! Faca login para continuar.")}`)
      );
    }

    const msg = error?.message?.includes("expired")
      ? "Link expirado. Solicite um novo."
      : "Falha na autenticacao. Tente novamente.";
    return NextResponse.redirect(buildUrl(request, `/login?error=${encodeURIComponent(msg)}`));
  }

  // Se o login foi via GitHub, salvar o provider_token
  if (data.session.provider_token) {
    const serviceClient = createServiceClient();

    await serviceClient.from("github_tokens").upsert(
      {
        user_id: data.session.user.id,
        provider_token: data.session.provider_token,
        provider_refresh_token: data.session.provider_refresh_token,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  return NextResponse.redirect(buildUrl(request, next));
}
