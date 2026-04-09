import { NextResponse } from "next/server";

import {
  voiceHealth,
  VoiceWorkerError,
  VoiceWorkerNotConfiguredError,
} from "@/lib/voice/client";

// Proxy simples pra UI checar se o worker de voz esta no ar.
// Nao requer autenticacao porque so faz uma chamada de liveness.
export async function GET() {
  try {
    const health = await voiceHealth();
    return NextResponse.json({ ok: true, ...health });
  } catch (err) {
    if (err instanceof VoiceWorkerNotConfiguredError) {
      return NextResponse.json(
        { ok: false, reason: "not_configured", message: err.message },
        { status: 200 },
      );
    }
    if (err instanceof VoiceWorkerError) {
      return NextResponse.json(
        { ok: false, reason: "worker_error", status: err.status, message: err.detail },
        { status: 200 },
      );
    }
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { ok: false, reason: "unreachable", message },
      { status: 200 },
    );
  }
}
