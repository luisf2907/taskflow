import { createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const GITHUB_BASE = "https://api.github.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const githubPath = "/" + path.join("/");

  // Checar se quer conteúdo raw via query param _raw=1
  const wantRaw = request.nextUrl.searchParams.get("_raw") === "1";

  // Montar query params para o GitHub (sem _raw)
  const ghSearchParams = new URLSearchParams(request.nextUrl.searchParams);
  ghSearchParams.delete("_raw");
  const searchStr = ghSearchParams.toString();
  const fullPath = searchStr ? `${githubPath}?${searchStr}` : githubPath;

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let token: string | null = null;

  if (user) {
    const service = createServiceClient();
    const { data: tokenData } = await service
      .from("github_tokens")
      .select("provider_token")
      .eq("user_id", user.id)
      .single();
    token = tokenData?.provider_token || null;
  }

  const headers: Record<string, string> = {
    Accept: wantRaw ? "application/vnd.github.v3.raw" : "application/vnd.github.v3+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${GITHUB_BASE}${fullPath}`, { headers });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json(
        { error: err || "GitHub API error" },
        { status: res.status }
      );
    }

    // Se pediu raw, retornar como texto
    if (wantRaw) {
      const text = await res.text();
      return new NextResponse(text, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
