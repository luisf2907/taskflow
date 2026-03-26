import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { closePR, mergePR, addPRComment } from "@/lib/github/client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { action, cardId, repoId, prNumber, mergeMethod, commitTitle, commitMessage, comment } = await request.json();

  if (!action || !["merge", "close"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Precisa de cardId OU (repoId + prNumber)
  if (!cardId && (!repoId || !prNumber)) {
    return NextResponse.json({ error: "Forneça cardId ou repoId+prNumber" }, { status: 400 });
  }

  // 1. Auth
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch { /* read-only context */ }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // 2. Resolver card e repo info
  let card: { id: string; pr_numero: number | null; pr_url: string | null; pr_status: string | null; pr_repo_id: string | null; pr_autor: string | null } | null = null;
  let repo: { owner: string; nome: string; coluna_done_id: string | null; coluna_doing_id: string | null } | null = null;
  let prNum: number;

  if (cardId) {
    // Fluxo original: buscar card e repo a partir do card
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
      .select("owner, nome, coluna_done_id, coluna_doing_id")
      .eq("id", cardData.pr_repo_id)
      .single();

    if (!repoData) {
      return NextResponse.json({ error: "Repositório não encontrado" }, { status: 404 });
    }
    repo = repoData;
  } else {
    // Novo fluxo: buscar repo direto, tentar achar card se existir
    prNum = prNumber;

    const { data: repoData } = await supabase
      .from("repositorios")
      .select("owner, nome, coluna_done_id, coluna_doing_id")
      .eq("id", repoId)
      .single();

    if (!repoData) {
      return NextResponse.json({ error: "Repositório não encontrado" }, { status: 404 });
    }
    repo = repoData;

    // Tentar encontrar card vinculado (não obrigatório)
    const { data: cardData } = await supabase
      .from("cartoes")
      .select("id, pr_numero, pr_url, pr_status, pr_repo_id, pr_autor")
      .eq("pr_repo_id", repoId)
      .eq("pr_numero", prNumber)
      .single();

    card = cardData || null;
  }

  // 3. Buscar token GitHub do user
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: tokenData } = await service
    .from("github_tokens")
    .select("provider_token")
    .eq("user_id", user.id)
    .single();

  if (!tokenData) {
    return NextResponse.json(
      { error: "Conecte sua conta GitHub nas configurações para executar esta ação." },
      { status: 403 }
    );
  }

  const token = tokenData.provider_token;

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

    // Atualizar card se existir
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
        atualizado_em: new Date().toISOString(),
      };
      if (repo.coluna_done_id) {
        updateData.coluna_id = repo.coluna_done_id;
        updateData.data_conclusao = new Date().toISOString();
      }
      await supabase.from("cartoes").update(updateData).eq("id", card.id);
    }

    return NextResponse.json({ ok: true, status: "merged" });
  }

  if (action === "close") {
    if (comment) {
      await addPRComment(repo.owner, repo.nome, prNum, comment, token);
    }

    const result = await closePR(repo.owner, repo.nome, prNum, token);
    if (result.error) {
      return NextResponse.json(
        { error: `Falha ao fechar PR: ${result.error}` },
        { status: result.status }
      );
    }

    // Atualizar card se existir
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
      if (repo.coluna_doing_id) {
        updateData.coluna_id = repo.coluna_doing_id;
      }
      await supabase.from("cartoes").update(updateData).eq("id", card.id);
    }

    return NextResponse.json({ ok: true, status: "closed" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
