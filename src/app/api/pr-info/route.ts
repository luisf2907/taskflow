import { createServerClient } from "@/lib/supabase/server";
import { getVcsBaseUrl } from "@/lib/drivers/vcs/config";
import { getVcsToken } from "@/lib/drivers/vcs/token";
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

  // Token VCS (instance-pat OU per-user)
  const token = await getVcsToken(user.id);
  if (!token) {
    return NextResponse.json({ error: "Sem token GitHub" }, { status: 403 });
  }

  // Fetch PR from VCS API (GitHub ou Gitea via VCS_API_URL)
  try {
    const res = await fetch(
      `${getVcsBaseUrl()}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
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
