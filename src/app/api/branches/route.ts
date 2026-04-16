import { createServerClient } from "@/lib/supabase/server";
import { getVcsToken } from "@/lib/drivers/vcs/config";
import { buscarBranchesAuth } from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody, applyRateLimitAsync } from "@/lib/api-utils";

const schema = z.object({
  owner: z.string().min(1).max(200),
  repo: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  // Rate limit: 30 per minute per IP
  const limited = await applyRateLimitAsync(request, "branches", { maxRequests: 30 });
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

  // Token: instance-pat global OU per-user do DB
  const token = await getVcsToken(user.id);
  if (!token) {
    return NextResponse.json(
      { error: "Conecte sua conta GitHub para acessar branches." },
      { status: 403 }
    );
  }

  const result = await buscarBranchesAuth(owner, repo, token);

  if (result.error) {
    return NextResponse.json(
      { error: "Erro ao buscar branches" },
      { status: result.status }
    );
  }

  return NextResponse.json({ branches: result.data || [] });
}
