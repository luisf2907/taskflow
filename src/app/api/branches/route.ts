import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { buscarBranchesAuth } from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody, applyRateLimit } from "@/lib/api-utils";

const schema = z.object({
  owner: z.string().min(1).max(200),
  repo: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  // Rate limit: 30 per minute per IP
  const limited = applyRateLimit(request, "branches", { maxRequests: 30 });
  if (limited) return limited;

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { owner, repo } = parsed.data;

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
      { error: "Conecte sua conta GitHub para acessar branches." },
      { status: 403 }
    );
  }

  const result = await buscarBranchesAuth(owner, repo, tokenData.provider_token);

  if (result.error) {
    return NextResponse.json(
      { error: "Erro ao buscar branches" },
      { status: result.status }
    );
  }

  return NextResponse.json({ branches: result.data || [] });
}
