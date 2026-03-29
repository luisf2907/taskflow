import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("perfis").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - start,
          error: "Database unreachable",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      },
      { status: 503 }
    );
  }
}
