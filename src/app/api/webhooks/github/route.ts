import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

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
  const body = await request.text();
  const event = request.headers.get("X-GitHub-Event");
  const signature = request.headers.get("X-Hub-Signature-256") || "";

  // Só processar eventos de pull_request
  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const payload = JSON.parse(body);
  const { repository, pull_request, action } = payload;

  if (!repository || !pull_request) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Buscar repo no banco
  const { data: repo } = await service
    .from("repositorios")
    .select("id, workspace_id, coluna_review_id, coluna_done_id, coluna_doing_id, webhook_secret")
    .eq("owner", repository.owner.login)
    .eq("nome", repository.name)
    .single();

  if (!repo) {
    return NextResponse.json({ error: "Repo not connected" }, { status: 404 });
  }

  // Verificar assinatura se webhook_secret configurado
  if (repo.webhook_secret) {
    if (!verifySignature(body, signature, repo.webhook_secret)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }
  }

  // PR aberto ou reaberto → criar card na coluna Review
  if (action === "opened" || action === "reopened") {
    if (!repo.coluna_review_id) {
      return NextResponse.json(
        { error: "No review column configured for this repo" },
        { status: 400 }
      );
    }

    // Contar cards para posição
    const { count } = await service
      .from("cartoes")
      .select("id", { count: "exact", head: true })
      .eq("coluna_id", repo.coluna_review_id);

    // Upsert (criar ou atualizar) usando pr_repo_id + pr_numero
    await service.from("cartoes").upsert(
      {
        coluna_id: repo.coluna_review_id,
        titulo: `PR #${pull_request.number}: ${pull_request.title}`,
        descricao: pull_request.body || `Pull request por ${pull_request.user.login}`,
        posicao: count || 0,
        pr_numero: pull_request.number,
        pr_url: pull_request.html_url,
        pr_status: "open",
        pr_repo_id: repo.id,
        pr_autor: pull_request.user.login,
        branch: pull_request.head?.ref || null,
      },
      { onConflict: "pr_repo_id,pr_numero" }
    );

    return NextResponse.json({ ok: true, action: "card_created" });
  }

  // PR fechado → mover card
  if (action === "closed") {
    const merged = pull_request.merged === true;
    const targetColumn = merged ? repo.coluna_done_id : repo.coluna_doing_id;
    const status = merged ? "merged" : "closed";

    if (targetColumn) {
      await service
        .from("cartoes")
        .update({
          pr_status: status,
          coluna_id: targetColumn,
          atualizado_em: new Date().toISOString(),
        })
        .eq("pr_repo_id", repo.id)
        .eq("pr_numero", pull_request.number);
    } else {
      // Só atualizar status se coluna alvo não configurada
      await service
        .from("cartoes")
        .update({
          pr_status: status,
          atualizado_em: new Date().toISOString(),
        })
        .eq("pr_repo_id", repo.id)
        .eq("pr_numero", pull_request.number);
    }

    return NextResponse.json({ ok: true, action: "card_moved", status });
  }

  return NextResponse.json({ ok: true, action: "ignored" });
}
