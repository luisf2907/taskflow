import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { buscarPRsAuth } from "@/lib/github/client";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { repoId } = await request.json();

  if (!repoId) {
    return NextResponse.json({ error: "repoId required" }, { status: 400 });
  }

  // Auth
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Buscar repo
  const { data: repo } = await supabase
    .from("repositorios")
    .select("id, owner, nome, coluna_review_id")
    .eq("id", repoId)
    .single();

  if (!repo || !repo.coluna_review_id) {
    return NextResponse.json({ error: "Repo not configured" }, { status: 400 });
  }

  // Buscar token
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
    titulo: `PR #${pr.number}: ${pr.title}`,
    descricao: pr.body || `Pull request por ${pr.user.login}`,
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
