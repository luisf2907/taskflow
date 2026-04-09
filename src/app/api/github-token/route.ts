import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { applyRateLimit } from "@/lib/api-utils";
import { encrypt } from "@/lib/crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/github-token
 * Returns masked token info (never the full token).
 */
export async function GET(request: NextRequest) {
  const rateLimited = applyRateLimit(request, "github-token-get", { maxRequests: 30, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data } = await service
    .from("github_tokens")
    .select("provider_token, encrypted_token, atualizado_em")
    .eq("user_id", user.id)
    .single();

  // Conectado se tem encrypted_token ou provider_token preenchido
  const hasToken = data?.encrypted_token || (data?.provider_token && data.provider_token !== "");
  if (!hasToken) {
    return NextResponse.json({ connected: false });
  }

  // Para masked display usamos provider_token (se disponivel) ou indicador generico
  const plainToken = data.provider_token && data.provider_token !== "" ? data.provider_token : null;
  const masked = plainToken && plainToken.length > 8
    ? `${plainToken.slice(0, 4)}${"•".repeat(Math.min(plainToken.length - 8, 20))}${plainToken.slice(-4)}`
    : "ghp_••••••••••••";

  return NextResponse.json({
    connected: true,
    maskedToken: masked,
    updatedAt: data.atualizado_em,
  });
}

/**
 * POST /api/github-token
 * Validates and saves a Personal Access Token.
 */
export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(request, "github-token-post", { maxRequests: 5, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token é obrigatório" }, { status: 400 });
  }

  // Basic format validation
  if (token.length < 10) {
    return NextResponse.json({ error: "Token inválido — muito curto" }, { status: 400 });
  }

  // Validate token with GitHub API
  let githubUser: string;
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 });
      }
      return NextResponse.json({ error: "Erro ao validar token com o GitHub" }, { status: 400 });
    }

    const data = await res.json();
    githubUser = data.login;
  } catch {
    return NextResponse.json({ error: "Não foi possível conectar ao GitHub" }, { status: 502 });
  }

  // Check token scopes
  const scopeRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  const scopes = scopeRes.headers.get("x-oauth-scopes") || "";
  const hasRepoScope = scopes.split(",").some((s) => s.trim() === "repo");

  // Save token via service role (encriptado se ENCRYPTION_KEY configurada)
  const service = createServiceClient();
  const encryptedToken = await encrypt(token);

  const { error } = await service.from("github_tokens").upsert(
    {
      user_id: user.id,
      // Se encryption ativa, salva encriptado e limpa plaintext
      provider_token: encryptedToken ? "" : token,
      encrypted_token: encryptedToken,
      provider_refresh_token: null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Erro ao salvar token" }, { status: 500 });
  }

  // Update github_username in profile
  await service
    .from("perfis")
    .update({ github_username: githubUser })
    .eq("id", user.id);

  return NextResponse.json({
    success: true,
    githubUser,
    hasRepoScope,
    warning: !hasRepoScope
      ? "Token não tem permissão 'repo'. Algumas funções (criar PRs, acessar repos privados) não funcionarão."
      : undefined,
  });
}

/**
 * DELETE /api/github-token
 * Removes the stored token.
 */
export async function DELETE(request: NextRequest) {
  const rateLimited = applyRateLimit(request, "github-token-delete", { maxRequests: 5, windowMs: 60_000 });
  if (rateLimited) return rateLimited;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("github_tokens")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Erro ao remover token" }, { status: 500 });
  }

  // Clear github_username from profile
  await service
    .from("perfis")
    .update({ github_username: null })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
