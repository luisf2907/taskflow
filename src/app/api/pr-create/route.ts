import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createPR } from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { repoId, title, head, base, body } = await request.json();

  if (!repoId || !title || !head || !base) {
    return NextResponse.json(
      { error: "repoId, title, head e base são obrigatórios" },
      { status: 400 }
    );
  }

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Buscar repo
  const { data: repo } = await supabase
    .from("repositorios")
    .select("id, owner, nome, coluna_review_id, workspace_id")
    .eq("id", repoId)
    .single();

  if (!repo) {
    return NextResponse.json({ error: "Repositório não encontrado" }, { status: 404 });
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
      { error: "Conecte sua conta GitHub para criar PRs." },
      { status: 403 }
    );
  }

  // Criar PR no GitHub
  const result = await createPR(
    repo.owner,
    repo.nome,
    title,
    head,
    base,
    body || "",
    tokenData.provider_token
  );

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: `Erro ao criar PR: ${result.error || "Resposta vazia"}` },
      { status: result.status }
    );
  }

  const pr = result.data;

  // Se coluna_review_id configurada, criar card automaticamente
  if (repo.coluna_review_id) {
    await service.from("cartoes").upsert(
      {
        coluna_id: repo.coluna_review_id,
        workspace_id: repo.workspace_id,
        titulo: `PR #${pr.number}: ${pr.title}`,
        descricao: pr.body || null,
        posicao: 0,
        pr_numero: pr.number,
        pr_url: pr.html_url,
        pr_status: "open",
        pr_repo_id: repo.id,
        pr_autor: pr.user?.login || user.email || "unknown",
      },
      { onConflict: "pr_repo_id,pr_numero" }
    );
  }

  return NextResponse.json({
    ok: true,
    pr: {
      number: pr.number,
      html_url: pr.html_url,
      title: pr.title,
    },
  });
}
