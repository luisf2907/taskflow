/**
 * Feature flags derivadas das env vars.
 *
 * IMPORTANTE — Next.js inlining:
 *   process.env.NEXT_PUBLIC_FOO       ← substituido em build (✓ funciona no client)
 *   const env = process.env; env.FOO  ← NAO substituido (✗ undefined no client)
 *
 * Por isso fazemos acesso DIRETO a cada NEXT_PUBLIC_* aqui. Envs
 * server-only (REALTIME_DRIVER sem prefixo, LLM_DRIVER, etc) sao
 * lidas via objeto — retornam undefined no client, mas isso e
 * esperado (client so precisa saber dos NEXT_PUBLIC_*).
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

function computeFeatures() {
  // ───── NEXT_PUBLIC_* — acessos DIRETOS pra Next.js inline em build ─────
  // (Sao substituidas por string literal no bundle cliente.)
  const publicRealtimeDriver = process.env.NEXT_PUBLIC_REALTIME_DRIVER as
    | RealtimeDriver
    | undefined;
  const publicSentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  // ───── Server-only envs (undefined no client, ok) ─────
  // Usamos objeto via typeof window check pra nao ler process.env no client.
  const serverEnv: NodeJS.ProcessEnv =
    typeof process !== "undefined" && typeof window === "undefined"
      ? process.env
      : ({} as NodeJS.ProcessEnv);

  // ───── LLM ─────
  const llmDriverRaw = serverEnv.LLM_DRIVER as LlmDriver | undefined;
  const llmDriver: LlmDriver =
    llmDriverRaw ?? (serverEnv.GEMINI_API_KEY ? "gemini" : "disabled");

  // ───── Email ─────
  const emailDriverRaw = serverEnv.EMAIL_DRIVER as EmailDriver | undefined;
  const emailDriver: EmailDriver =
    emailDriverRaw ?? (serverEnv.RESEND_API_KEY ? "resend" : "disabled");

  // ───── Storage ─────
  const storageDriver: StorageDriver =
    (serverEnv.STORAGE_DRIVER as StorageDriver | undefined) ?? "supabase";

  // ───── Realtime ─────
  // Preferir NEXT_PUBLIC_REALTIME_DRIVER no client (inlined pelo Next).
  // Server tambem aceita REALTIME_DRIVER sem prefixo como fallback.
  const realtimeDriver: RealtimeDriver =
    publicRealtimeDriver ??
    (serverEnv.REALTIME_DRIVER as RealtimeDriver | undefined) ??
    "supabase";

  // ───── Voice ─────
  const voiceDriverRaw = serverEnv.VOICE_DRIVER as VoiceDriver | undefined;
  const voiceDriver: VoiceDriver =
    voiceDriverRaw ?? (serverEnv.VOICE_WORKER_URL ? "fastapi" : "disabled");

  // ───── VCS ─────
  // NEXT_PUBLIC_VCS_TOKEN_MODE permite UI decidir se mostra botao OAuth
  // ou campo de PAT ou read-only "gerenciado pelo admin" (instance-pat).
  const vcsDriver: VcsDriver =
    (serverEnv.VCS_DRIVER as VcsDriver | undefined) ?? "github";
  const vcsTokenMode: VcsTokenMode =
    (process.env.NEXT_PUBLIC_VCS_TOKEN_MODE as VcsTokenMode | undefined) ??
    (serverEnv.VCS_TOKEN_MODE as VcsTokenMode | undefined) ??
    "oauth";

  // ───── Observability ─────
  // NEXT_PUBLIC_OBS_DRIVER tambem aceito (pros sentry.client.config.ts).
  const publicObsDriver = process.env.NEXT_PUBLIC_OBS_DRIVER as ObsDriver | undefined;
  const obsDriverRaw = publicObsDriver ?? (serverEnv.OBS_DRIVER as ObsDriver | undefined);
  const obsDriver: ObsDriver =
    obsDriverRaw ?? (publicSentryDsn ? "sentry" : "console");

  // ───── Auth mode ─────
  // NEXT_PUBLIC_AUTH_MODE (build arg) pra UI client-side saber se mostra
  // botao OAuth, tela de signup, etc. Server fallback pra AUTH_MODE.
  const publicAuthMode = process.env.NEXT_PUBLIC_AUTH_MODE as AuthMode | undefined;
  const authMode: AuthMode =
    publicAuthMode ??
    (serverEnv.AUTH_MODE as AuthMode | undefined) ??
    "standard";

  return {
    llm: { driver: llmDriver, enabled: llmDriver !== "disabled" },
    email: {
      driver: emailDriver,
      enabled: emailDriver !== "disabled" && emailDriver !== "console",
    },
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

    // Atalhos booleanos pra uso rapido na UI
    ai: llmDriver !== "disabled",
    emailEnabled: emailDriver !== "disabled",
    voiceEnabled: voiceDriver !== "disabled",
    vcsEnabled: vcsDriver !== "disabled",
    signupEnabled: authMode === "standard",
    soloMode: authMode === "solo",
  } as const;
}

/**
 * Features da instance. Congelado em build time (via inline das envs
 * NEXT_PUBLIC_* pelo Next.js). Mudar driver requer rebuild do app.
 */
export const features = computeFeatures();

export type Features = typeof features;
