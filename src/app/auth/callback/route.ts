import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function sanitizeRedirectPath(next: string | null): string {
  if (!next) return "/";
  // Prevent open redirect: only allow relative paths starting with /
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
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
