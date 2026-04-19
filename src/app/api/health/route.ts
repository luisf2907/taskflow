import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "degraded" | "error";

interface HealthCheck {
  status: CheckStatus;
  latencyMs: number;
  message?: string;
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

export async function GET() {
  const start = Date.now();
  const supabase = createServiceClient();

  // Roda checks em paralelo
  const [db, auth, storage] = await Promise.all([
    checkDatabase(supabase),
    checkAuth(),
    checkStorage(supabase),
  ]);

  const checks = { db, auth, storage };

  // Status geral: error se DB falha; degraded se auth/storage falha; ok se tudo passa
  let overall: CheckStatus = "ok";
  if (db.status === "error") {
    overall = "error";
  } else if (auth.status !== "ok" || storage.status !== "ok") {
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
