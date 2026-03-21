import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { buscarBranchesAuth } from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { owner, repo } = await request.json();

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner e repo são obrigatórios" }, { status: 400 });
  }

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Buscar token GitHub
  const service = createServiceClient();
  const { data: tokenData } = await service
    .from("github_tokens")
    .select("provider_token")
    .eq("user_id", user.id)
    .single();

  if (!tokenData) {
    return NextResponse.json(
      { error: "Conecte sua conta GitHub para acessar branches." },
      { status: 403 }
    );
  }

  const result = await buscarBranchesAuth(owner, repo, tokenData.provider_token);

  if (result.error) {
    return NextResponse.json(
      { error: `Erro ao buscar branches: ${result.error}` },
      { status: result.status }
    );
  }

  return NextResponse.json({ branches: result.data || [] });
}
