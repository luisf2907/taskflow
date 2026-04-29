import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "degraded" | "error";

interface HealthCheck {
  status: CheckStatus;
  latencyMs: number;
  message?: string;
  details?: Record<string, string | boolean | number | null>;
}

async function checkDatabase(supabase: ReturnType<typeof createServiceClient>): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const { error } = await supabase.from("perfis").select("id").limit(1);
    if (error) {
      return { status: "error", latencyMs: Date.now() - start, message: error.message };
    }
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

function configured(name: string): boolean {
  return !!env(name);
}

async function checkAuth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const url =
      process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (!url) {
      return { status: "error", latencyMs: 0, message: "no supabase url configured" };
    }
    const res = await fetch(`${url}/auth/v1/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return {
        status: "degraded",
        latencyMs: Date.now() - start,
        message: `gotrue returned ${res.status}`,
      };
    }
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();

  if (env("REDIS_URL")) {
    let redis: import("ioredis").default | null = null;
    try {
      const { default: Redis } = await import("ioredis");
      redis = new Redis(env("REDIS_URL")!, {
        connectTimeout: 1000,
        commandTimeout: 1000,
        enableOfflineQueue: false,
        lazyConnect: true,
        maxRetriesPerRequest: 0,
      });
      await redis.connect();
      await redis.ping();
      return {
        status: "ok",
        latencyMs: Date.now() - start,
        message: "redis tcp",
      };
    } catch (err) {
      return {
        status: "degraded",
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : "redis unavailable",
      };
    } finally {
      if (redis) {
        redis.disconnect();
      }
    }
  }

  if (configured("UPSTASH_REDIS_REST_URL") || configured("UPSTASH_REDIS_REST_TOKEN")) {
    const ready =
      configured("UPSTASH_REDIS_REST_URL") && configured("UPSTASH_REDIS_REST_TOKEN");
    return {
      status: ready ? "ok" : "degraded",
      latencyMs: Date.now() - start,
      message: ready ? "upstash configured" : "upstash env incomplete",
    };
  }

  return {
    status: "ok",
    latencyMs: Date.now() - start,
    message: "in-memory fallback",
  };
}

async function checkStorage(supabase: ReturnType<typeof createServiceClient>): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Lista buckets via API do Supabase Storage — testa que storage responde
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      return { status: "degraded", latencyMs: Date.now() - start, message: error.message };
    }
    return {
      status: "ok",
      latencyMs: Date.now() - start,
      message: `${data?.length ?? 0} buckets`,
    };
  } catch (err) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "unknown",
    };
  }
}

async function checkVoice(): Promise<HealthCheck> {
  const start = Date.now();
  const driver = env("VOICE_DRIVER") ?? (configured("VOICE_WORKER_URL") ? "fastapi" : "disabled");

  if (driver === "disabled") {
    return {
      status: "ok",
      latencyMs: Date.now() - start,
      message: "disabled",
      details: { driver },
    };
  }

  if (driver !== "fastapi") {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      message: `unknown voice driver: ${driver}`,
      details: { driver },
    };
  }

  const baseUrl = env("VOICE_WORKER_URL")?.replace(/\/$/, "");
  if (!baseUrl || !configured("VOICE_WORKER_API_KEY")) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      message: "voice worker env incomplete",
      details: {
        driver,
        hasUrl: !!baseUrl,
        hasApiKey: configured("VOICE_WORKER_API_KEY"),
      },
    };
  }

  try {
    const res = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${env("VOICE_WORKER_API_KEY")}`,
        "ngrok-skip-browser-warning": "true",
      },
      signal: AbortSignal.timeout(3000),
    });

    return {
      status: res.ok ? "ok" : "degraded",
      latencyMs: Date.now() - start,
      message: res.ok ? "worker reachable" : `worker returned ${res.status}`,
      details: { driver },
    };
  } catch (err) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "voice worker unavailable",
      details: { driver },
    };
  }
}

function checkDrivers(): HealthCheck {
  const start = Date.now();
  const issues: string[] = [];

  const authMode = env("AUTH_MODE") ?? "standard";
  if (authMode === "solo" && !configured("SOLO_USER_EMAIL")) {
    issues.push("AUTH_MODE=solo requires SOLO_USER_EMAIL");
  }

  const llmDriver = env("LLM_DRIVER") ?? (configured("GEMINI_API_KEY") ? "gemini" : "disabled");
  if (llmDriver === "gemini" && !configured("GEMINI_API_KEY")) {
    issues.push("LLM_DRIVER=gemini requires GEMINI_API_KEY");
  }
  if (["ollama", "openai-compat"].includes(llmDriver) && !configured("LLM_BASE_URL")) {
    issues.push(`LLM_DRIVER=${llmDriver} requires LLM_BASE_URL`);
  }
  if (["openai-compat", "anthropic"].includes(llmDriver) && !configured("LLM_API_KEY")) {
    issues.push(`LLM_DRIVER=${llmDriver} requires LLM_API_KEY`);
  }

  const emailDriver = env("EMAIL_DRIVER") ?? (configured("RESEND_API_KEY") ? "resend" : "disabled");
  if (emailDriver === "resend" && !configured("RESEND_API_KEY")) {
    issues.push("EMAIL_DRIVER=resend requires RESEND_API_KEY");
  }
  if (emailDriver === "smtp" && (!configured("SMTP_HOST") || !configured("SMTP_FROM"))) {
    issues.push("EMAIL_DRIVER=smtp requires SMTP_HOST and SMTP_FROM");
  }

  const storageDriver = env("STORAGE_DRIVER") ?? "supabase";
  if (storageDriver === "local-disk" && !configured("STORAGE_LOCAL_PATH")) {
    issues.push("STORAGE_DRIVER=local-disk should set STORAGE_LOCAL_PATH");
  }
  if (
    storageDriver === "s3-compat" &&
    (!configured("STORAGE_S3_ENDPOINT") ||
      !configured("STORAGE_S3_ACCESS_KEY") ||
      !configured("STORAGE_S3_SECRET_KEY"))
  ) {
    issues.push("STORAGE_DRIVER=s3-compat requires S3 endpoint and credentials");
  }

  const vcsDriver = env("VCS_DRIVER") ?? "github";
  const vcsTokenMode = env("VCS_TOKEN_MODE") ?? env("NEXT_PUBLIC_VCS_TOKEN_MODE") ?? "oauth";
  if (vcsDriver === "gitea" && !configured("VCS_API_URL")) {
    issues.push("VCS_DRIVER=gitea requires VCS_API_URL");
  }
  if (vcsDriver !== "disabled" && vcsTokenMode === "instance-pat" && !configured("VCS_INSTANCE_PAT")) {
    issues.push("VCS_TOKEN_MODE=instance-pat requires VCS_INSTANCE_PAT");
  }

  const obsDriver = env("OBS_DRIVER") ?? env("NEXT_PUBLIC_OBS_DRIVER") ?? "console";
  if (["sentry", "glitchtip"].includes(obsDriver) && !configured("NEXT_PUBLIC_SENTRY_DSN")) {
    issues.push(`OBS_DRIVER=${obsDriver} requires NEXT_PUBLIC_SENTRY_DSN`);
  }

  return {
    status: issues.length > 0 ? "degraded" : "ok",
    latencyMs: Date.now() - start,
    message: issues.length > 0 ? issues.join("; ") : "driver configuration ok",
    details: {
      authMode,
      emailDriver,
      llmDriver,
      obsDriver,
      realtimeDriver: env("REALTIME_DRIVER") ?? env("NEXT_PUBLIC_REALTIME_DRIVER") ?? "supabase",
      storageDriver,
      vcsDriver,
      vcsTokenMode,
      voiceDriver: env("VOICE_DRIVER") ?? (configured("VOICE_WORKER_URL") ? "fastapi" : "disabled"),
    },
  };
}

export async function GET() {
  const start = Date.now();
  const supabase = createServiceClient();

  // Roda checks em paralelo
  const [db, auth, storage, redis, voice] = await Promise.all([
    checkDatabase(supabase),
    checkAuth(),
    checkStorage(supabase),
    checkRedis(),
    checkVoice(),
  ]);

  const drivers = checkDrivers();
  const checks = { db, auth, storage, redis, voice, drivers };

  // Status geral: error se DB falha; degraded se algum check operacional falha; ok se tudo passa
  let overall: CheckStatus = "ok";
  if (db.status === "error") {
    overall = "error";
  } else if (Object.values(checks).some((check) => check.status !== "ok")) {
    overall = "degraded";
  }

  const httpStatus = overall === "error" ? 503 : 200;

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
      checks,
    },
    { status: httpStatus },
  );
}
