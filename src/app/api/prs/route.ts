import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { buscarPRsAuth, buscarPRs } from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody, applyRateLimit } from "@/lib/api-utils";

const schema = z.object({
  owner: z.string().min(1).max(200),
  repo: z.string().min(1).max(200),
  state: z.enum(["open", "closed", "all"]).optional().default("all"),
});

export async function POST(request: NextRequest) {
  // Rate limit: 20 per minute per IP
  const limited = applyRateLimit(request, "prs", { maxRequests: 20 });
  if (limited) return limited;

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { owner, repo, state } = parsed.data;

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Fallback para API pública (repos públicos)
    const prs = await buscarPRs(owner, repo, state);
    return NextResponse.json({ prs });
  }

  // Tentar buscar com token autenticado
  const service = createServiceClient();
  const { data: tokenData } = await service
    .from("github_tokens")
    .select("provider_token")
    .eq("user_id", user.id)
    .single();

  if (!tokenData) {
    // Fallback para API pública
    const prs = await buscarPRs(owner, repo, state);
    return NextResponse.json({ prs });
  }

  const result = await buscarPRsAuth(owner, repo, tokenData.provider_token, state);

  if (result.error) {
    // Fallback para API pública se token falhou
    const prs = await buscarPRs(owner, repo, state);
    return NextResponse.json({ prs, fallback: true });
  }

  return NextResponse.json({ prs: result.data || [] });
}
