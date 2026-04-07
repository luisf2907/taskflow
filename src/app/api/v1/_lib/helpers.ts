import { NextResponse } from "next/server";
import type { ApiKeyAuth } from "@/lib/mcp-auth";
import { createServiceClient } from "@/lib/supabase/server";

export type { ApiKeyAuth };

export type Handler = (
  auth: ApiKeyAuth,
  request: Request,
  params: string[]
) => Promise<NextResponse>;

export function getService() {
  return createServiceClient();
}

export async function getBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getSearchParams(request: Request) {
  return new URL(request.url).searchParams;
}

export async function getGitHubToken(
  service: ReturnType<typeof createServiceClient>,
  userId: string
) {
  const { data } = await service
    .from("github_tokens")
    .select("provider_token")
    .eq("user_id", userId)
    .single();
  return data?.provider_token ?? null;
}
