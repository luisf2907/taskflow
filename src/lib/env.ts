import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════
// Schemas — public (client-safe) e server (includes secrets)
// ═══════════════════════════════════════════════════════════════════════════

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().min(1).optional(),
});

const serverEnvSchema = envSchema.extend({
  // ───── Supabase (obrigatorias) ─────
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // URL interna do Supabase — usada pelo server-side do Next.js quando
  // NEXT_PUBLIC_SUPABASE_URL aponta pra um gateway externo (ex: localhost:8000
  // no self-hosted, que de dentro do container nao resolve). Default:
  // reutiliza NEXT_PUBLIC_SUPABASE_URL. No docker-compose setamos pra
  // http://nginx:8000 (container hostname).
  SUPABASE_INTERNAL_URL: z.string().url().optional(),

  // ───── Encryption (obrigatoria) ─────
  // AES-256-GCM key para encriptar dados sensiveis (GitHub tokens, api keys, etc.)
  // 64 hex chars = 32 bytes. Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  // OBRIGATORIA: sem isso, tokens ficam em plaintext no Postgres.
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""),

  // ───── SaaS externos (opcionais, cloud default) ─────
  GEMINI_API_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  // TaskFlow Voice worker (FastAPI + pyannote/whisper, exposto via ngrok)
  VOICE_WORKER_URL: z.string().url().optional(),
  VOICE_WORKER_API_KEY: z.string().min(1).optional(),
  // Secret pra HMAC do webhook de callback do worker pro Next.js.
  VOICE_WEBHOOK_SECRET: z.string().min(32).optional(),
  // Upstash Redis for rate limiting (serverless-compatible)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ═══════════════════════════════════════════════════════════════════════
  // Self-hosted — drivers plugaveis (todas opcionais, default preserva cloud)
  // ═══════════════════════════════════════════════════════════════════════

  // ───── LLM driver ─────
  // gemini       = default; usa GEMINI_API_KEY
  // ollama       = http local; requer LLM_BASE_URL (ex: http://ollama:11434)
  // openai-compat= qualquer OpenAI-compatible endpoint; LLM_BASE_URL + LLM_API_KEY
  // anthropic    = Claude API; LLM_API_KEY
  // disabled     = features de IA somem da UI
  LLM_DRIVER: z.enum(["gemini", "ollama", "openai-compat", "anthropic", "disabled"]).optional(),
  LLM_BASE_URL: z.string().url().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),

  // ───── Email driver ─────
  // smtp     = servidor SMTP (interno ou externo tipo Gmail relay)
  // resend   = default cloud; usa RESEND_API_KEY
  // postmark = Postmark API (opcional, placeholder)
  // console  = loga email em stdout (dev)
  // disabled = convites viram link copiavel; notif so in-app
  EMAIL_DRIVER: z.enum(["smtp", "resend", "postmark", "console", "disabled"]).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  SMTP_SECURE: z.coerce.boolean().optional(),

  // ───── Storage driver ─────
  // supabase    = default; usa Supabase Storage API
  // local-disk  = salva em disco local (STORAGE_LOCAL_PATH), serve via /api/storage/*
  // s3-compat   = qualquer S3-compatible (MinIO, AWS S3, etc); STORAGE_S3_*
  STORAGE_DRIVER: z.enum(["supabase", "local-disk", "s3-compat"]).optional(),
  STORAGE_LOCAL_PATH: z.string().optional(),
  STORAGE_S3_ENDPOINT: z.string().url().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ACCESS_KEY: z.string().optional(),
  STORAGE_S3_SECRET_KEY: z.string().optional(),
  STORAGE_S3_BUCKET_PREFIX: z.string().optional(),

  // ───── Realtime driver ─────
  // supabase       = default cloud; usa postgres_changes via Supabase Realtime
  // pg-notify-sse  = self-hosted leve; triggers + LISTEN/NOTIFY + SSE endpoint
  // polling        = degradado; SWR revalida a cada 10s
  REALTIME_DRIVER: z.enum(["supabase", "pg-notify-sse", "polling"]).optional(),

  // ───── Voice driver ─────
  // fastapi  = worker externo (precisa GPU); usa VOICE_WORKER_URL
  // disabled = UI some tab "Gravar", upload direto ainda funciona sem transcricao
  VOICE_DRIVER: z.enum(["fastapi", "disabled"]).optional(),

  // ───── VCS driver (GitHub/Gitea) ─────
  // github   = default; api.github.com ou VCS_API_URL custom
  // gitea    = Gitea compativel; exige VCS_API_URL
  // disabled = aba Repos some
  VCS_DRIVER: z.enum(["github", "gitea", "disabled"]).optional(),
  VCS_API_URL: z.string().url().optional(),
  // Modo de aquisicao de token (independente do provedor de auth):
  //   oauth        = botao "conectar com GitHub" (requer Auth OAuth configurado)
  //   pat          = usuario cola PAT em Settings (funciona com qualquer auth mode)
  //   instance-pat = um PAT global pra todo o instance (pra home lab 1 pessoa)
  VCS_TOKEN_MODE: z.enum(["oauth", "pat", "instance-pat"]).optional(),
  VCS_INSTANCE_PAT: z.string().optional(),

  // ───── Observability driver ─────
  // sentry    = default cloud; usa NEXT_PUBLIC_SENTRY_DSN
  // glitchtip = Sentry-compatible self-hosted; mesma DSN
  // console   = stderr only
  // noop      = descarta
  OBS_DRIVER: z.enum(["sentry", "glitchtip", "console", "noop"]).optional(),

  // ───── Auth mode (so afeta UI/UX, GoTrue sempre roda) ─────
  // standard = default cloud; signup + OAuth + email conform
  // closed   = signup off, admin cria users via CLI, sem email
  // solo     = bypass de login, auto-sessao com SOLO_USER_EMAIL
  AUTH_MODE: z.enum(["standard", "closed", "solo"]).optional(),
  SOLO_USER_EMAIL: z.string().email().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// Parsing (lazy, SSR-safe)
// ═══════════════════════════════════════════════════════════════════════════

function parsePublicEnv() {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Missing or invalid environment variables:\n${formatted}`);
  }

  return result.data;
}

function parseServerEnv() {
  const result = serverEnvSchema.safeParse({
    // Supabase core
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_INTERNAL_URL: process.env.SUPABASE_INTERNAL_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

    // SaaS externos
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    VOICE_WORKER_URL: process.env.VOICE_WORKER_URL,
    VOICE_WORKER_API_KEY: process.env.VOICE_WORKER_API_KEY,
    VOICE_WEBHOOK_SECRET: process.env.VOICE_WEBHOOK_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // Self-hosted drivers
    LLM_DRIVER: process.env.LLM_DRIVER,
    LLM_BASE_URL: process.env.LLM_BASE_URL,
    LLM_MODEL: process.env.LLM_MODEL,
    LLM_API_KEY: process.env.LLM_API_KEY,

    EMAIL_DRIVER: process.env.EMAIL_DRIVER,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM: process.env.SMTP_FROM,
    SMTP_SECURE: process.env.SMTP_SECURE,

    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    STORAGE_LOCAL_PATH: process.env.STORAGE_LOCAL_PATH,
    STORAGE_S3_ENDPOINT: process.env.STORAGE_S3_ENDPOINT,
    STORAGE_S3_REGION: process.env.STORAGE_S3_REGION,
    STORAGE_S3_ACCESS_KEY: process.env.STORAGE_S3_ACCESS_KEY,
    STORAGE_S3_SECRET_KEY: process.env.STORAGE_S3_SECRET_KEY,
    STORAGE_S3_BUCKET_PREFIX: process.env.STORAGE_S3_BUCKET_PREFIX,

    REALTIME_DRIVER: process.env.REALTIME_DRIVER,
    VOICE_DRIVER: process.env.VOICE_DRIVER,

    VCS_DRIVER: process.env.VCS_DRIVER,
    VCS_API_URL: process.env.VCS_API_URL,
    VCS_TOKEN_MODE: process.env.VCS_TOKEN_MODE,
    VCS_INSTANCE_PAT: process.env.VCS_INSTANCE_PAT,

    OBS_DRIVER: process.env.OBS_DRIVER,

    AUTH_MODE: process.env.AUTH_MODE,
    SOLO_USER_EMAIL: process.env.SOLO_USER_EMAIL,
  });

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Missing or invalid server environment variables:\n${formatted}`);
  }

  return result.data;
}

/** Public env vars (safe for client) — lazy loaded on first access */
let _publicEnv: ReturnType<typeof parsePublicEnv> | null = null;
export function getPublicEnv() {
  if (!_publicEnv) _publicEnv = parsePublicEnv();
  return _publicEnv;
}

/** @deprecated Use getPublicEnv() instead. Kept for backward compatibility. */
export const publicEnv = new Proxy({} as ReturnType<typeof parsePublicEnv>, {
  get(_target, prop: string) {
    return getPublicEnv()[prop as keyof ReturnType<typeof parsePublicEnv>];
  },
});

/** Server-only env vars (includes service role key) — only import in server code */
export function getServerEnv() {
  return parseServerEnv();
}
