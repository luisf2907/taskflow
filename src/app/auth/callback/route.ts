import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function sanitizeRedirectPath(next: string | null): string {
  if (!next) return "/dashboard";
  // Prevent open redirect: only allow relative paths starting with /
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next"));
  const errorParam = searchParams.get("error_description") || searchParams.get("error");

  // Se o Supabase retornou erro (ex: token expirado), redirecionar com mensagem amigavel
  if (errorParam) {
    const msg = errorParam.includes("expired")
      ? "Link expirado. Solicite um novo."
      : "Erro na autenticacao. Tente novamente.";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Link+invalido.+Solicite+um+novo.", request.url));
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    const msg = error?.message?.includes("expired")
      ? "Link expirado. Solicite um novo."
      : "Falha na autenticacao. Tente novamente.";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, request.url));
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

  return NextResponse.redirect(new URL(next, request.url));
}
