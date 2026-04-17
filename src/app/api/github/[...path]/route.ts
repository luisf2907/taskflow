import { createServerClient } from "@/lib/supabase/server";
import { getVcsBaseUrl } from "@/lib/drivers/vcs/config";
import { getVcsToken } from "@/lib/drivers/vcs/token";
import { NextRequest, NextResponse } from "next/server";
import { applyRateLimitAsync } from "@/lib/api-utils";

// Allowed GitHub API path prefixes to prevent abuse
const ALLOWED_PREFIXES = ["/repos/", "/user/"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Rate limit: 30 per minute per IP
  const limited = await applyRateLimitAsync(request, "github-proxy", { maxRequests: 30 });
  if (limited) return limited;

  const { path } = await params;
  const githubPath = "/" + path.map(encodeURIComponent).join("/");

  // SECURITY: Only allow known GitHub API paths
  if (!ALLOWED_PREFIXES.some((prefix) => githubPath.startsWith(prefix))) {
    return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
  }

  // Checar se quer conteúdo raw via query param _raw=1
  const wantRaw = request.nextUrl.searchParams.get("_raw") === "1";

  // Montar query params para o GitHub (sem _raw)
  const ghSearchParams = new URLSearchParams(request.nextUrl.searchParams);
  ghSearchParams.delete("_raw");
  const searchStr = ghSearchParams.toString();
  const fullPath = searchStr ? `${githubPath}?${searchStr}` : githubPath;

  // Auth
  // SEGURANÇA: o user.id abaixo vem do cookie de sessão via auth.getUser(),
  // nunca de header/body controlado pelo cliente. Não altere essa invariante.
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Token VCS (instance-pat global OU per-user do DB)
  const token = user ? await getVcsToken(user.id) : null;

  const headers: Record<string, string> = {
    Accept: wantRaw ? "application/vnd.github.v3.raw" : "application/vnd.github.v3+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${getVcsBaseUrl()}${fullPath}`, { headers });

    if (!res.ok) {
      return NextResponse.json(
        { error: "GitHub API error" },
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
