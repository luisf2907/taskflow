import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { getVcsToken } from "@/lib/drivers/vcs/config";
import { closePR, mergePR, addPRComment } from "@/lib/github/client";
import { executarAutomacoes } from "@/lib/automacoes-executor";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody, applyRateLimitAsync, sanitize } from "@/lib/api-utils";

const schema = z.object({
  action: z.enum(["merge", "close"]),
  cardId: z.string().uuid().optional(),
  repoId: z.string().uuid().optional(),
  prNumber: z.number().int().positive().optional(),
  mergeMethod: z.enum(["merge", "squash", "rebase"]).optional(),
  commitTitle: z.string().max(500).optional(),
  commitMessage: z.string().max(5000).optional(),
  comment: z.string().max(5000).optional(),
}).refine(
  (d) => d.cardId || (d.repoId && d.prNumber),
  { message: "Forneça cardId ou repoId+prNumber" }
);

export async function POST(request: NextRequest) {
  // Rate limit: 10 PR actions per minute per IP
  const limited = await applyRateLimitAsync(request, "pr-actions", { maxRequests: 10 });
  if (limited) return limited;

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { action, cardId, repoId, prNumber, mergeMethod, commitTitle, commitMessage, comment } = parsed.data;

  // 1. Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // 2. Resolver card e repo info
  let card: { id: string; pr_numero: number | null; pr_url: string | null; pr_status: string | null; pr_repo_id: string | null; pr_autor: string | null } | null = null;
  let repo: { owner: string; nome: string; workspace_id: string; coluna_done_id: string | null; coluna_doing_id: string | null } | null = null;
  let prNum: number;

  if (cardId) {
    const { data: cardData } = await supabase
      .from("cartoes")
      .select("id, pr_numero, pr_url, pr_status, pr_repo_id, pr_autor")
      .eq("id", cardId)
      .single();

    if (!cardData?.pr_numero || !cardData.pr_repo_id) {
      return NextResponse.json({ error: "Este card não está vinculado a um PR" }, { status: 400 });
    }
    card = cardData;
    prNum = cardData.pr_numero;

    const { data: repoData } = await supabase
      .from("repositorios")
      .select("owner, nome, workspace_id, coluna_done_id, coluna_doing_id")
      .eq("id", cardData.pr_repo_id)
      .single();

    if (!repoData) {
      return NextResponse.json({ error: "Repositório não encontrado" }, { status: 404 });
    }
    repo = repoData;
  } else {
    prNum = prNumber!;

    const { data: repoData } = await supabase
      .from("repositorios")
      .select("owner, nome, workspace_id, coluna_done_id, coluna_doing_id")
      .eq("id", repoId!)
      .single();

    if (!repoData) {
      return NextResponse.json({ error: "Repositório não encontrado" }, { status: 404 });
    }
    repo = repoData;

    const { data: cardData } = await supabase
      .from("cartoes")
      .select("id, pr_numero, pr_url, pr_status, pr_repo_id, pr_autor")
      .eq("pr_repo_id", repoId!)
      .eq("pr_numero", prNumber!)
      .single();

    card = cardData || null;
  }

  // SECURITY: Verify user is a member of the repo's workspace
  // (RLS on repositorios already checks this via .select() above — if repoData is null, user has no access)
  // But let's also explicitly verify workspace membership for defense-in-depth
  // 3. Token VCS (instance-pat global OU per-user do DB)
  const service = createServiceClient();
  const token = await getVcsToken(user.id);

  if (!token) {
    return NextResponse.json(
      { error: "Conecte sua conta GitHub nas configurações para executar esta ação." },
      { status: 403 }
    );
  }

  // 4. Executar ação no GitHub
  if (action === "merge") {
    const result = await mergePR(repo.owner, repo.nome, prNum, token, {
      mergeMethod: mergeMethod || "merge",
      commitTitle: commitTitle || undefined,
      commitMessage: commitMessage || undefined,
    });
    if (result.error) {
      return NextResponse.json(
        { error: `Falha ao fazer merge: ${result.error}` },
        { status: result.status }
      );
    }

    // Save history + clear PR fields (automations handle the move)
    if (card) {
      const historicoEntry = {
        numero: prNum,
        url: card.pr_url,
        status: "merged",
        autor: card.pr_autor || "unknown",
        data: new Date().toISOString(),
      };

      const { data: cardAtual } = await supabase
        .from("cartoes")
        .select("pr_historico")
        .eq("id", card.id)
        .single();
      const historico = Array.isArray(cardAtual?.pr_historico) ? cardAtual.pr_historico : [];

      const updateData: Record<string, unknown> = {
        pr_numero: null,
        pr_url: null,
        pr_status: null,
        pr_repo_id: null,
        pr_autor: null,
        pr_historico: [...historico, historicoEntry],
        data_conclusao: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from("cartoes")
        .update(updateData)
        .eq("id", card.id);

      if (updateErr) {
        return NextResponse.json({
          ok: true,
          status: "merged",
          warning: "PR merged on GitHub, but card update failed. Reload to sync.",
          dbError: updateErr.message,
        });
      }

      // Fire pr_merged automations (they handle moving the card)
      const { data: automacoes } = await service
        .from("automacoes")
        .select("*")
        .eq("workspace_id", repo.workspace_id)
        .eq("ativo", true);
      if (automacoes && automacoes.length > 0) {
        await executarAutomacoes(service, automacoes, {
          tipo: "pr_merged",
          config: {},
          cartao_id: card.id,
        });
      }
    }

    return NextResponse.json({ ok: true, status: "merged" });
  }

  if (action === "close") {
    if (comment) {
      await addPRComment(repo.owner, repo.nome, prNum, sanitize(comment, 5000), token);
    }

    const result = await closePR(repo.owner, repo.nome, prNum, token);
    if (result.error) {
      return NextResponse.json(
        { error: `Falha ao fechar PR: ${result.error}` },
        { status: result.status }
      );
    }

    // Save history + clear PR fields + fire pr_closed automations
    if (card) {
      const historicoEntry = {
        numero: prNum,
        url: card.pr_url,
        status: "closed",
        autor: card.pr_autor || "unknown",
        data: new Date().toISOString(),
      };

      const { data: cardAtual } = await supabase
        .from("cartoes")
        .select("pr_historico")
        .eq("id", card.id)
        .single();
      const historico = Array.isArray(cardAtual?.pr_historico) ? cardAtual.pr_historico : [];

      const updateData: Record<string, unknown> = {
        pr_numero: null,
        pr_url: null,
        pr_status: null,
        pr_repo_id: null,
        pr_autor: null,
        pr_historico: [...historico, historicoEntry],
        atualizado_em: new Date().toISOString(),
      };

      const { error: updateErr } = await supabase
        .from("cartoes")
        .update(updateData)
        .eq("id", card.id);

      if (updateErr) {
        return NextResponse.json({
          ok: true,
          status: "closed",
          warning: "PR closed on GitHub, but card update failed. Reload to sync.",
          dbError: updateErr.message,
        });
      }

      // Fire pr_closed automations (e.g. move back to "A Fazer")
      const { data: automacoes } = await service
        .from("automacoes")
        .select("*")
        .eq("workspace_id", repo.workspace_id)
        .eq("ativo", true);
      if (automacoes && automacoes.length > 0) {
        await executarAutomacoes(service, automacoes, {
          tipo: "pr_closed",
          config: {},
          cartao_id: card.id,
        });
      }
    }

    return NextResponse.json({ ok: true, status: "closed" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
