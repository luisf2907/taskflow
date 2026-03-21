import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { closePR, mergePR } from "@/lib/github/client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { action, cardId } = await request.json();

  if (!action || !cardId || !["merge", "close"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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

  // 2. Buscar card com info do repo
  const { data: card } = await supabase
    .from("cartoes")
    .select("id, pr_numero, pr_url, pr_status, pr_repo_id")
    .eq("id", cardId)
    .single();

  if (!card?.pr_numero || !card.pr_repo_id) {
    return NextResponse.json({ error: "Este card não está vinculado a um PR" }, { status: 400 });
  }

  // Buscar info do repo
  const { data: repo } = await supabase
    .from("repositorios")
    .select("owner, nome, coluna_done_id, coluna_doing_id")
    .eq("id", card.pr_repo_id)
    .single();

  if (!repo) {
    return NextResponse.json({ error: "Repositório não encontrado" }, { status: 404 });
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
    const result = await mergePR(repo.owner, repo.nome, card.pr_numero, token);
    if (result.error) {
      return NextResponse.json(
        { error: `Falha ao fazer merge: ${result.error}` },
        { status: result.status }
      );
    }

    // Mover card para Done
    const updateData: Record<string, unknown> = {
      pr_status: "merged",
      atualizado_em: new Date().toISOString(),
    };
    if (repo.coluna_done_id) {
      updateData.coluna_id = repo.coluna_done_id;
    }
    await supabase.from("cartoes").update(updateData).eq("id", cardId);

    return NextResponse.json({ ok: true, status: "merged" });
  }

  if (action === "close") {
    const result = await closePR(repo.owner, repo.nome, card.pr_numero, token);
    if (result.error) {
      return NextResponse.json(
        { error: `Falha ao fechar PR: ${result.error}` },
        { status: result.status }
      );
    }

    // Mover card para Doing
    const updateData: Record<string, unknown> = {
      pr_status: "closed",
      atualizado_em: new Date().toISOString(),
    };
    if (repo.coluna_doing_id) {
      updateData.coluna_id = repo.coluna_doing_id;
    }
    await supabase.from("cartoes").update(updateData).eq("id", cardId);

    return NextResponse.json({ ok: true, status: "closed" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
