import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody, applyRateLimitAsync } from "@/lib/api-utils";

const schema = z.object({
  owner: z.string().min(1).max(200),
  repo: z.string().min(1).max(200),
  prNumber: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  // Rate limit: 30 per minute per IP
  const limited = await applyRateLimitAsync(request, "pr-info", { maxRequests: 30 });
  if (limited) return limited;

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { owner, repo, prNumber } = parsed.data;

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Get GitHub token
  const service = createServiceClient();
  const { data: tokenData } = await service
    .from("github_tokens")
    .select("provider_token")
    .eq("user_id", user.id)
    .single();

  if (!tokenData) {
    return NextResponse.json({ error: "Sem token GitHub" }, { status: 403 });
  }

  // Fetch PR from GitHub
  try {
    const res = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.provider_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ title: null, state: null }, { status: 200 });
    }

    const pr = await res.json();
    return NextResponse.json({
      title: pr.title,
      state: pr.state,
      html_url: pr.html_url,
      user: pr.user?.login,
    });
  } catch {
    return NextResponse.json({ title: null, state: null }, { status: 200 });
  }
}
