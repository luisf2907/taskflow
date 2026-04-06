import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { createPR, requestReviewers } from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody, applyRateLimit, sanitize } from "@/lib/api-utils";

const schema = z.object({
  repoId: z.string().uuid(),
  title: z.string().min(1).max(500),
  head: z.string().min(1).max(200),
  base: z.string().min(1).max(200),
  body: z.string().max(10000).optional(),
  cardId: z.string().uuid().optional(),
  reviewers: z.array(z.string().max(100)).max(20).optional(),
});

export async function POST(request: NextRequest) {
  // Rate limit: 10 PR creates per minute per IP
  const limited = applyRateLimit(request, "pr-create", { maxRequests: 10 });
  if (limited) return limited;

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { repoId, title, head, base, body, cardId, reviewers } = parsed.data;

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Buscar repo (RLS already filters by workspace membership)
  const { data: repo } = await supabase
    .from("repositorios")
    .select("id, owner, nome, coluna_review_id, workspace_id")
    .eq("id", repoId)
    .single();

  if (!repo) {
    return NextResponse.json({ error: "Repositório não encontrado" }, { status: 404 });
  }

  // SECURITY: Explicit workspace membership check (defense-in-depth)
  const { count: memberCount } = await supabase
    .from("workspace_usuarios")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", repo.workspace_id)
    .eq("user_id", user.id);

  if (!memberCount || memberCount === 0) {
    return NextResponse.json({ error: "Sem permissão neste workspace" }, { status: 403 });
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

  const token = tokenData.provider_token;

  // Criar PR no GitHub
  const result = await createPR(
    repo.owner,
    repo.nome,
    sanitize(title, 500),
    head,
    base,
    sanitize(body || "", 10000),
    token
  );

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: `Erro ao criar PR: ${result.error || "Resposta vazia"}` },
      { status: result.status }
    );
  }

  const pr = result.data;

  // Solicitar reviewers (se fornecido)
  if (reviewers && reviewers.length > 0) {
    await requestReviewers(repo.owner, repo.nome, pr.number, reviewers, token);
  }

  // Encontrar coluna Review
  let colunaReviewId = repo.coluna_review_id;
  if (!colunaReviewId) {
    const { data: quadros } = await service
      .from("quadros")
      .select("id")
      .eq("workspace_id", repo.workspace_id);

    if (quadros && quadros.length > 0) {
      const quadroIds = quadros.map((q) => q.id);
      const { data: colunaReview } = await service
        .from("colunas")
        .select("id")
        .in("quadro_id", quadroIds)
        .ilike("nome", "%review%")
        .limit(1)
        .maybeSingle();
      colunaReviewId = colunaReview?.id || null;
    }
  }

  // Vincular a card existente OU criar card novo
  if (cardId) {
    // SECURITY: Verify card exists and belongs to user's workspace (via RLS)
    const { data: existingCard } = await supabase
      .from("cartoes")
      .select("id")
      .eq("id", cardId)
      .single();

    if (!existingCard) {
      return NextResponse.json({ error: "Card não encontrado ou sem permissão" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      pr_numero: pr.number,
      pr_url: pr.html_url,
      pr_status: "open",
      pr_repo_id: repo.id,
      pr_autor: pr.user?.login || user.email || "unknown",
      branch: pr.head?.ref || null,
      branch_repo_id: repo.id,
      atualizado_em: new Date().toISOString(),
    };
    if (colunaReviewId) {
      updateData.coluna_id = colunaReviewId;
    }
    await service.from("cartoes").update(updateData).eq("id", cardId);
  } else if (colunaReviewId) {
    await service.from("cartoes").upsert(
      {
        coluna_id: colunaReviewId,
        workspace_id: repo.workspace_id,
        titulo: sanitize(`PR #${pr.number}: ${pr.title}`, 500),
        descricao: sanitize(pr.body || "", 5000),
        posicao: 0,
        pr_numero: pr.number,
        pr_url: pr.html_url,
        pr_status: "open",
        pr_repo_id: repo.id,
        pr_autor: pr.user?.login || user.email || "unknown",
        branch: pr.head?.ref || null,
        branch_repo_id: repo.id,
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
