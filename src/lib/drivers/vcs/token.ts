/**
 * VCS token resolution — server-only.
 *
 * Vive em arquivo separado de `config.ts` porque usa `createServiceClient`
 * (que importa `next/headers`), e `config.ts` eh importado transitivamente
 * por codigo Client Component via `@/lib/github/client`. Mantendo esta
 * funcao aqui (+ `import "server-only"`) garante que ela nunca entra num
 * bundle client.
 *
 * Modos:
 *   - instance-pat: retorna VCS_INSTANCE_PAT direto (global, sem user)
 *   - oauth/pat: le github_tokens do DB pro userId, decripta com AES-GCM
 *
 * Retorna null se nao encontrar — rota API deve responder 401.
 */

import "server-only";

import { decrypt } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getVcsTokenMode } from "./config";

export async function getVcsToken(userId: string | null): Promise<string | null> {
  const mode = getVcsTokenMode();

  // Instance-wide PAT — global, ignora userId
  if (mode === "instance-pat") {
    const pat = process.env.VCS_INSTANCE_PAT;
    return pat && pat.length > 0 ? pat : null;
  }

  // Per-user token do DB (oauth ou pat user-provided)
  if (!userId) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("github_tokens")
    .select("provider_token, encrypted_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  // Prefere encrypted_token (mais recente) ao provider_token (OAuth antigo)
  if (data.encrypted_token) {
    const plain = await decrypt(data.encrypted_token);
    if (plain) return plain;
  }

  if (data.provider_token && data.provider_token !== "") {
    return data.provider_token;
  }

  return null;
}
