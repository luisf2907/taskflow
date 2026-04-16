/**
 * Feature flags derivadas das env vars.
 *
 * Cada modulo plugavel tem um flag tipado. Componentes de UI consomem estes
 * flags para esconder features desabilitadas em vez de quebrar ou mostrar
 * botoes mortos.
 *
 * Regra de default (backward compat com cloud):
 *   - Se o driver NAO foi setado explicitamente (env = undefined), infere do
 *     que esta disponivel (ex: GEMINI_API_KEY presente → LLM ativo em gemini).
 *   - Self-hosted `.env.*.example` seta drivers explicitamente pra ativar o
 *     caminho local (ollama, smtp, etc) ou desligar (disabled).
 *
 * ATENCAO: este modulo pode ser importado no CLIENT. So le envs publicas ou
 * deriva flags booleanos que NAO expoem secrets. Chaves sensiveis (API keys,
 * passwords) vivem em getServerEnv() e nao sao acessiveis aqui.
 */

type LlmDriver = "gemini" | "ollama" | "openai-compat" | "anthropic" | "disabled";
type EmailDriver = "smtp" | "resend" | "postmark" | "console" | "disabled";
type StorageDriver = "supabase" | "local-disk" | "s3-compat";
type RealtimeDriver = "supabase" | "pg-notify-sse" | "polling";
type VoiceDriver = "fastapi" | "disabled";
type VcsDriver = "github" | "gitea" | "disabled";
type VcsTokenMode = "oauth" | "pat" | "instance-pat";
type ObsDriver = "sentry" | "glitchtip" | "console" | "noop";
type AuthMode = "standard" | "closed" | "solo";

/**
 * Flags derivadas. Importar de qualquer lugar (server ou client).
 *
 * No server usa `process.env` diretamente; no client, Next.js inlina os valores
 * de `NEXT_PUBLIC_*` em build time. Para as envs nao-publicas usadas aqui
 * (LLM_DRIVER, EMAIL_DRIVER, etc), o Next.js as expoe no bundle SOMENTE se
 * elas forem referenciadas em client components — e aqui so usamos o boolean
 * derivado, nunca o valor cru da env.
 *
 * Como a derivacao acontece em build time (valores de env congelados no
 * bundle), operador precisa REBUILDAR o app depois de mudar drivers. Isso e
 * aceitavel porque mudanca de driver e evento raro (opera vel por `docker
 * compose down && up --build`).
 */
function computeFeatures() {
  const env: NodeJS.ProcessEnv =
    typeof process !== "undefined" ? process.env : ({} as NodeJS.ProcessEnv);

  // ───── LLM ─────
  const llmDriverRaw = env.LLM_DRIVER as LlmDriver | undefined;
  const llmDriver: LlmDriver =
    llmDriverRaw ?? (env.GEMINI_API_KEY ? "gemini" : "disabled");

  // ───── Email ─────
  const emailDriverRaw = env.EMAIL_DRIVER as EmailDriver | undefined;
  const emailDriver: EmailDriver =
    emailDriverRaw ?? (env.RESEND_API_KEY ? "resend" : "disabled");

  // ───── Storage ─────
  const storageDriver: StorageDriver =
    (env.STORAGE_DRIVER as StorageDriver | undefined) ?? "supabase";

  // ───── Realtime ─────
  const realtimeDriver: RealtimeDriver =
    (env.REALTIME_DRIVER as RealtimeDriver | undefined) ?? "supabase";

  // ───── Voice ─────
  const voiceDriverRaw = env.VOICE_DRIVER as VoiceDriver | undefined;
  const voiceDriver: VoiceDriver =
    voiceDriverRaw ?? (env.VOICE_WORKER_URL ? "fastapi" : "disabled");

  // ───── VCS ─────
  const vcsDriver: VcsDriver =
    (env.VCS_DRIVER as VcsDriver | undefined) ?? "github";
  const vcsTokenMode: VcsTokenMode =
    (env.VCS_TOKEN_MODE as VcsTokenMode | undefined) ?? "oauth";

  // ───── Observability ─────
  const obsDriverRaw = env.OBS_DRIVER as ObsDriver | undefined;
  const obsDriver: ObsDriver =
    obsDriverRaw ?? (env.NEXT_PUBLIC_SENTRY_DSN ? "sentry" : "console");

  // ───── Auth mode ─────
  const authMode: AuthMode = (env.AUTH_MODE as AuthMode | undefined) ?? "standard";

  return {
    // Drivers (pra quem precisa saber qual backend usar)
    llm: { driver: llmDriver, enabled: llmDriver !== "disabled" },
    email: { driver: emailDriver, enabled: emailDriver !== "disabled" && emailDriver !== "console" },
    storage: { driver: storageDriver },
    realtime: { driver: realtimeDriver },
    voice: { driver: voiceDriver, enabled: voiceDriver !== "disabled" },
    vcs: {
      driver: vcsDriver,
      enabled: vcsDriver !== "disabled",
      tokenMode: vcsTokenMode,
    },
    observability: { driver: obsDriver },
    auth: { mode: authMode },

    // Atalhos booleanos para uso rapido na UI
    ai: llmDriver !== "disabled",
    emailEnabled: emailDriver !== "disabled",
    voiceEnabled: voiceDriver !== "disabled",
    vcsEnabled: vcsDriver !== "disabled",
    signupEnabled: authMode === "standard",
    soloMode: authMode === "solo",
  } as const;
}

/**
 * Features da instance. Congelado em build time (via inline das envs pelo
 * Next.js). Mudar driver requer rebuild do app.
 */
export const features = computeFeatures();

/** Tipo derivado pra quem precisa tipar callbacks/props que recebem features. */
export type Features = typeof features;
