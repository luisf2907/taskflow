import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { githubAuthFetch } from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimitAsync } from "@/lib/api-utils";

interface GitHubRepoAPI {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export async function GET(request: NextRequest) {
  // Rate limit: 10 per minute per IP
  const limited = await applyRateLimitAsync(request, "repos", { maxRequests: 10 });
  if (limited) return limited;

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
      { error: "Conecte sua conta GitHub para listar repositórios." },
      { status: 403 }
    );
  }

  // Buscar repos do user
  const result = await githubAuthFetch<GitHubRepoAPI[]>(
    "/user/repos?per_page=100&sort=updated&direction=desc&type=all",
    tokenData.provider_token
  );

  if (result.error) {
    return NextResponse.json(
      { error: "Erro ao buscar repositórios" },
      { status: result.status }
    );
  }

  const repos = (result.data || []).map((r) => ({
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    description: r.description,
    private: r.private,
    html_url: r.html_url,
    language: r.language,
    stars: r.stargazers_count,
    updated_at: r.updated_at,
    owner: r.owner.login,
    owner_avatar: r.owner.avatar_url,
  }));

  return NextResponse.json({ repos }, {
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
