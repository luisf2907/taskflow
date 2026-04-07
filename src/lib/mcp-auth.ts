import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

export interface ApiKeyAuth {
  userId: string;
  workspaceId: string;
  keyId: string;
}

/**
 * Gera hash SHA256 de uma API key
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Gera uma nova API key aleatoria
 * Formato: tf_sk_<32 chars hex>
 */
export function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `tf_sk_${hex}`;
}

/**
 * Autentica request via API key no header Authorization
 * Retorna { userId, workspaceId, keyId } ou NextResponse com erro
 */
export async function authenticateApiKey(
  request: Request
): Promise<ApiKeyAuth | NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header obrigatorio. Use: Bearer tf_sk_..." },
      { status: 401 }
    );
  }

  const key = authHeader.slice(7).trim();

  if (!key.startsWith("tf_sk_")) {
    return NextResponse.json(
      { error: "API key invalida. Deve comecar com tf_sk_" },
      { status: 401 }
    );
  }

  const keyHash = hashApiKey(key);
  const service = createServiceClient();

  const { data: apiKey, error } = await service
    .from("api_keys")
    .select("id, user_id, workspace_id")
    .eq("key_hash", keyHash)
    .single();

  if (error || !apiKey) {
    return NextResponse.json(
      { error: "API key invalida ou revogada" },
      { status: 401 }
    );
  }

  // Atualizar ultimo uso (fire-and-forget com error logging)
  Promise.resolve(
    service
      .from("api_keys")
      .update({ ultimo_uso: new Date().toISOString() })
      .eq("id", apiKey.id)
  ).catch((err: unknown) => {
    console.error("[mcp-auth] Failed to update ultimo_uso:", err instanceof Error ? err.message : err);
  });

  return {
    userId: apiKey.user_id,
    workspaceId: apiKey.workspace_id,
    keyId: apiKey.id,
  };
}
