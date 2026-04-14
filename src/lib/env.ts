import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().min(1).optional(),
});

const serverEnvSchema = envSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  // TaskFlow Voice worker (FastAPI + pyannote/whisper, exposto via ngrok)
  VOICE_WORKER_URL: z.string().url().optional(),
  VOICE_WORKER_API_KEY: z.string().min(1).optional(),
  // Secret pra HMAC do webhook de callback do worker pro Next.js.
  // Usado em /api/reunioes/[id]/webhook pra garantir que so o worker pode
  // postar resultado pra uma reuniao (nao qualquer um que adivinhe a URL).
  VOICE_WEBHOOK_SECRET: z.string().min(32).optional(),
  // AES-256-GCM key para encriptar dados sensiveis (GitHub tokens, etc.)
  // 64 hex chars = 32 bytes. Gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ENCRYPTION_KEY: z.string().length(64).optional(),
  // Upstash Redis for rate limiting (serverless-compatible)
  // Create free instance at https://console.upstash.com
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

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
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    VOICE_WORKER_URL: process.env.VOICE_WORKER_URL,
    VOICE_WORKER_API_KEY: process.env.VOICE_WORKER_API_KEY,
    VOICE_WEBHOOK_SECRET: process.env.VOICE_WEBHOOK_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
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
