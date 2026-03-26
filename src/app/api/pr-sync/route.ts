import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { buscarPRsAuth } from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody, applyRateLimit } from "@/lib/api-utils";

const schema = z.object({
  repoId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  // Rate limit: 5 syncs per minute per IP
  const limited = applyRateLimit(request, "pr-sync", { maxRequests: 5 });
  if (limited) return limited;

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { repoId } = parsed.data;

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Buscar repo (RLS filters by workspace membership)
  const { data: repo } = await supabase
    .from("repositorios")
    .select("id, owner, nome, coluna_review_id, workspace_id")
    .eq("id", repoId)
    .single();

  if (!repo || !repo.coluna_review_id) {
    return NextResponse.json({ error: "Repo not configured" }, { status: 400 });
  }

  // SECURITY: Explicit workspace membership check
  const { count: memberCount } = await supabase
    .from("workspace_usuarios")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", repo.workspace_id)
    .eq("user_id", user.id);

  if (!memberCount || memberCount === 0) {
    return NextResponse.json({ error: "Sem permissão neste workspace" }, { status: 403 });
  }

  // Buscar token
  const service = createServiceClient();
  const { data: tokenData } = await service
    .from("github_tokens")
    .select("provider_token")
    .eq("user_id", user.id)
    .single();

  if (!tokenData) {
    return NextResponse.json({ error: "No GitHub token" }, { status: 403 });
  }

  // Buscar PRs abertos do GitHub
  const { data: prs } = await buscarPRsAuth(
    repo.owner,
    repo.nome,
    tokenData.provider_token,
    "open"
  );

  if (!prs || prs.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  // Buscar cards PR existentes para este repo
  const { data: cardsExistentes } = await supabase
    .from("cartoes")
    .select("pr_numero")
    .eq("pr_repo_id", repo.id)
    .not("pr_numero", "is", null);

  const numerosExistentes = new Set(
    (cardsExistentes || []).map((c) => c.pr_numero)
  );

  // Criar cards para PRs que não existem
  const novos = prs.filter((pr) => !numerosExistentes.has(pr.number));

  if (novos.length === 0) {
    return NextResponse.json({ ok: true, synced: 0 });
  }

  const { count } = await supabase
    .from("cartoes")
    .select("id", { count: "exact", head: true })
    .eq("coluna_id", repo.coluna_review_id);

  const cardsParaCriar = novos.map((pr, idx) => ({
    coluna_id: repo.coluna_review_id,
    titulo: `PR #${pr.number}: ${pr.title}`.slice(0, 500),
    descricao: (pr.body || `Pull request por ${pr.user.login}`).slice(0, 5000),
    posicao: (count || 0) + idx,
    pr_numero: pr.number,
    pr_url: pr.html_url,
    pr_status: "open" as const,
    pr_repo_id: repo.id,
    pr_autor: pr.user.login,
  }));

  await service.from("cartoes").upsert(cardsParaCriar, {
    onConflict: "pr_repo_id,pr_numero",
  });

  return NextResponse.json({ ok: true, synced: novos.length });
}
