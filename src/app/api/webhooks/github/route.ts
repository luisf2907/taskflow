import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimitAsync, sanitize } from "@/lib/api-utils";
import { executarAutomacoes } from "@/lib/automacoes-executor";

function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Rate limit webhooks: 60 per minute per IP
  const limited = await applyRateLimitAsync(request, "webhook", { maxRequests: 60 });
  if (limited) return limited;

  const body = await request.text();
  const event = request.headers.get("X-GitHub-Event");
  const signature = request.headers.get("X-Hub-Signature-256") || "";

  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { repository, pull_request, action } = payload as {
    repository?: { owner?: { login?: string }; name?: string };
    pull_request?: {
      number?: number;
      title?: string;
      body?: string;
      html_url?: string;
      merged?: boolean;
      user?: { login?: string };
      head?: { ref?: string };
    };
    action?: string;
  };

  if (!repository?.owner?.login || !repository?.name || !pull_request?.number) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Find all workspace repos matching this GitHub repo (workspace isolation)
  const { data: repos } = await service
    .from("repositorios")
    .select("id, workspace_id, coluna_review_id, coluna_done_id, coluna_doing_id, webhook_secret")
    .eq("owner", repository.owner.login)
    .eq("nome", repository.name);

  if (!repos || repos.length === 0) {
    return NextResponse.json({ error: "Repo not connected" }, { status: 404 });
  }

  // Batch load all automations for involved workspaces (avoid N+1 per repo)
  const workspaceIds = [...new Set(repos.map((r) => r.workspace_id))];
  const { data: todasAutomacoes } = await service
    .from("automacoes")
    .select("*")
    .in("workspace_id", workspaceIds)
    .eq("ativo", true);
  const automacoesPorWs = new Map<string, typeof todasAutomacoes>();
  for (const a of todasAutomacoes || []) {
    const lista = automacoesPorWs.get(a.workspace_id) || [];
    lista.push(a);
    automacoesPorWs.set(a.workspace_id, lista);
  }

  const results = [];

  for (const repo of repos) {
    // SECURITY: webhook_secret is MANDATORY
    if (!repo.webhook_secret) {
      results.push({ workspace: repo.workspace_id, error: "Webhook secret not configured" });
      continue;
    }

    if (!verifySignature(body, signature, repo.webhook_secret)) {
      results.push({ workspace: repo.workspace_id, error: "Invalid signature" });
      continue;
    }

    // === PR opened/reopened → create card in Review column ===
    if (action === "opened" || action === "reopened") {
      if (!repo.coluna_review_id) {
        results.push({ workspace: repo.workspace_id, action: "skipped", reason: "no_review_column" });
        continue;
      }

      const { count } = await service
        .from("cartoes")
        .select("id", { count: "exact", head: true })
        .eq("coluna_id", repo.coluna_review_id);

      const { data: card, error: upsertErr } = await service.from("cartoes").upsert(
        {
          coluna_id: repo.coluna_review_id,
          titulo: sanitize(`PR #${pull_request.number}: ${pull_request.title || ""}`, 500),
          descricao: sanitize(pull_request.body || `Pull request por ${pull_request.user?.login || "unknown"}`, 5000),
          posicao: count || 0,
          pr_numero: pull_request.number,
          pr_url: sanitize(pull_request.html_url, 2000),
          pr_status: "open",
          pr_repo_id: repo.id,
          pr_autor: sanitize(pull_request.user?.login, 100),
          branch: sanitize(pull_request.head?.ref, 200),
          branch_repo_id: repo.id,
        },
        { onConflict: "pr_repo_id,pr_numero" }
      ).select("id").single();

      // Fire pr_opened automations (pre-loaded, no N+1)
      if (card) {
        const automacoes = automacoesPorWs.get(repo.workspace_id) || [];
        if (automacoes.length > 0) {
          await executarAutomacoes(service, automacoes, {
            tipo: "pr_opened",
            config: {},
            cartao_id: card.id,
          });
        }
      }

      results.push({
        workspace: repo.workspace_id,
        action: upsertErr ? "error" : "card_created",
        ...(upsertErr && { error: upsertErr.message }),
      });
      continue;
    }

    // === PR closed → save history, fire automations (no hardcoded move) ===
    if (action === "closed") {
      const merged = pull_request.merged === true;
      const status = merged ? "merged" : "closed";

      const { data: cardVinculado } = await service
        .from("cartoes")
        .select("id, pr_numero, pr_url, pr_autor, pr_historico")
        .eq("pr_repo_id", repo.id)
        .eq("pr_numero", pull_request.number!)
        .single();

      if (!cardVinculado) {
        results.push({ workspace: repo.workspace_id, action: "no_card_found" });
        continue;
      }

      // DUPLICATION GUARD: check if this PR was already processed
      const historico = Array.isArray(cardVinculado.pr_historico) ? cardVinculado.pr_historico : [];
      const jaProcessado = historico.some(
        (h: { numero?: number; status?: string }) =>
          h.numero === pull_request.number && (h.status === "merged" || h.status === "closed")
      );
      if (jaProcessado) {
        results.push({ workspace: repo.workspace_id, action: "already_processed" });
        continue;
      }

      // Save to history and clear PR fields
      const historicoEntry = {
        numero: pull_request.number,
        url: pull_request.html_url,
        status,
        autor: pull_request.user?.login || "unknown",
        data: new Date().toISOString(),
      };

      const updateData: Record<string, unknown> = {
        pr_numero: null,
        pr_url: null,
        pr_status: null,
        pr_repo_id: null,
        pr_autor: null,
        pr_historico: [...historico, historicoEntry],
        atualizado_em: new Date().toISOString(),
      };

      // Set data_conclusao on merge (this is a data field, not a "move")
      if (merged) {
        updateData.data_conclusao = new Date().toISOString();
      }

      const { error: updateErr } = await service
        .from("cartoes")
        .update(updateData)
        .eq("id", cardVinculado.id);

      // Fire automations — pr_merged or pr_closed (pre-loaded, no N+1)
      if (!updateErr) {
        const automacoes = automacoesPorWs.get(repo.workspace_id) || [];
        if (automacoes.length > 0) {
          await executarAutomacoes(service, automacoes, {
            tipo: merged ? "pr_merged" : "pr_closed",
            config: {},
            cartao_id: cardVinculado.id,
          });
        }
      }

      results.push({
        workspace: repo.workspace_id,
        action: updateErr ? "error" : "card_updated",
        status,
        ...(updateErr && { error: updateErr.message }),
      });
      continue;
    }

    results.push({ workspace: repo.workspace_id, action: "ignored" });
  }

  // Se QUALQUER repo falhou por signature/secret, rejeitar tudo (seguranca)
  if (results.some((r) => r.error?.includes("signature") || r.error?.includes("secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, results });
}
