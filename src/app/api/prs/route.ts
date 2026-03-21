import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { buscarPRsAuth, buscarPRs } from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { owner, repo, state = "all" } = await request.json();

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner e repo são obrigatórios" }, { status: 400 });
  }

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Fallback para API pública (repos públicos)
    const prs = await buscarPRs(owner, repo, state);
    return NextResponse.json({ prs });
  }

  // Tentar buscar com token autenticado
  const service = createServiceClient();
  const { data: tokenData } = await service
    .from("github_tokens")
    .select("provider_token")
    .eq("user_id", user.id)
    .single();

  if (!tokenData) {
    // Fallback para API pública
    const prs = await buscarPRs(owner, repo, state);
    return NextResponse.json({ prs });
  }

  const result = await buscarPRsAuth(owner, repo, tokenData.provider_token, state);

  if (result.error) {
    // Fallback para API pública se token falhou
    const prs = await buscarPRs(owner, repo, state);
    return NextResponse.json({ prs, fallback: true });
  }

  return NextResponse.json({ prs: result.data || [] });
}
