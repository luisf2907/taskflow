/**
 * VCS driver — pure config helpers (safe em Client Components).
 *
 * Este arquivo NAO pode importar nada server-only (supabase/server,
 * next/headers, fs, etc) porque `@/lib/github/client` o importa
 * transitivamente via `@/lib/drivers/vcs/config` -> esse modulo sobe
 * no bundle client e quebra o build com "You're importing a module
 * that depends on next/headers".
 *
 * A funcao `getVcsToken` (que acessa o DB) vive em `./token.ts` com
 * `import "server-only"` pra enforce a separacao.
 *
 * Uso nas rotas API:
 *   import { getVcsToken } from "@/lib/drivers/vcs/token";
 *   import { getVcsBaseUrl } from "@/lib/drivers/vcs/config";
 *
 * Gitea: a API tem alta compat com GitHub v3 pra os endpoints que o
 * app usa (repos, branches, pulls, commits, contents). Endpoints
 * nao-compativeis vao falhar com 404 — tratar caso a caso se surgir.
 */

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
 * Se o instance-pat esta configurado. UI usa pra decidir se mostra
 * botao "conectar com GitHub" (false) ou "token gerenciado por admin"
 * (true).
 */
export function hasInstancePat(): boolean {
  return getVcsTokenMode() === "instance-pat" && !!process.env.VCS_INSTANCE_PAT;
}
