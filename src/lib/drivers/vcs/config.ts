/**
 * VCS driver — configuracao e helpers de token.
 *
 * Unifica:
 *   - Base URL da API (github.com, github enterprise, gitea)
 *   - Token per-user (OAuth/PAT do DB) OU instance-wide PAT
 *
 * Uso nas rotas API:
 *   const token = await getVcsToken(userId);   // prioriza instance-pat
 *   const baseUrl = getVcsBaseUrl();
 *   fetch(`${baseUrl}/repos/.../pulls`, { headers: { Authorization: `Bearer ${token}` } })
 *
 * Gitea: a API tem alta compat com GitHub v3 pra os endpoints que o
 * app usa (repos, branches, pulls, commits, contents). Endpoints
 * nao-compativeis vao falhar com 404 — tratar caso a caso se surgir.
 */

import { decrypt } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";

// ───── URL base ─────

/**
 * Base URL da API VCS. Default: https://api.github.com.
 * Override via VCS_API_URL (suporta GitHub Enterprise ou Gitea).
 */
export function getVcsBaseUrl(): string {
  const url = process.env.VCS_API_URL;
  if (url && url.length > 0) return url.replace(/\/$/, "");
  return "https://api.github.com";
}

/**
 * Driver configurado. Nao confunde com provider — driver eh "github"
 * ou "gitea" (molda URL default), mas qualquer um pode apontar via
 * VCS_API_URL.
 */
export function getVcsDriver(): "github" | "gitea" | "disabled" {
  const d = process.env.VCS_DRIVER;
  if (d === "gitea" || d === "disabled") return d;
  return "github";
}

// ───── Modo de token ─────

export type VcsTokenMode = "oauth" | "pat" | "instance-pat";

export function getVcsTokenMode(): VcsTokenMode {
  const m = process.env.VCS_TOKEN_MODE;
  if (m === "pat" || m === "instance-pat") return m;
  return "oauth";
}

/**
 * Token usado pra operacoes do VCS.
 *
 * - instance-pat: retorna VCS_INSTANCE_PAT direto (global, sem user)
 * - oauth/pat: le github_tokens do DB pro userId
 *
 * Retorna null se nao encontrar (rota API deve responder 401).
 */
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

/**
 * Se o instance-pat esta configurado. UI usa pra decidir se mostra
 * botao "conectar com GitHub" (false) ou "token gerenciado por admin"
 * (true).
 */
export function hasInstancePat(): boolean {
  return getVcsTokenMode() === "instance-pat" && !!process.env.VCS_INSTANCE_PAT;
}
