/**
 * Cliente HTTP tipado pro TaskFlow Voice worker (FastAPI + pyannote/whisper).
 *
 * SOMENTE SERVER-SIDE — usa SUPABASE_SERVICE_ROLE_KEY e VOICE_WORKER_API_KEY,
 * nao pode ser importado em componentes `"use client"`.
 *
 * O worker roda na maquina da GPU e e exposto via ngrok. Next.js chama ele
 * a partir de Route Handlers (proxy) pra manter a API key no server-side.
 */
import { getServerEnv } from "@/lib/env";

// ---------------------------------------------------------------------------
// Types (mirrored from src/worker/schemas.py)
// ---------------------------------------------------------------------------

export interface VoiceHealthResponse {
  status: "ok" | "loading";
  models_loaded: boolean;
  device: string;
  whisper_model: string;
  embedding_model: string;
  diarization_model: string;
  embedding_dim: number | null;
}

export interface EnrollmentResponse {
  embedding: number[];
  embedding_dim: number;
  embedding_model: string;
  duration_s: number;
  speech_s: number;
  quality_ok: boolean;
  quality_reason: string | null;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

export interface SpeakerInfo {
  label: string;
  total_speech_s: number;
  n_turns: number;
  embedding: number[] | null;
  skipped: boolean;
  skip_reason: string | null;
}

export interface ProcessMeetingResponse {
  duration_s: number;
  language: string;
  language_probability: number;
  segments: TranscriptSegment[];
  speakers: SpeakerInfo[];
  embedding_dim: number;
  embedding_model: string;
  timings_ms: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Low-level client
// ---------------------------------------------------------------------------

export class VoiceWorkerNotConfiguredError extends Error {
  constructor() {
    super(
      "VOICE_WORKER_URL e VOICE_WORKER_API_KEY precisam estar em .env.local",
    );
    this.name = "VoiceWorkerNotConfiguredError";
  }
}

export class VoiceWorkerError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`Voice worker error (${status}): ${detail}`);
    this.name = "VoiceWorkerError";
  }
}

function getConfig(): { baseUrl: string; apiKey: string } {
  const env = getServerEnv();
  if (!env.VOICE_WORKER_URL || !env.VOICE_WORKER_API_KEY) {
    throw new VoiceWorkerNotConfiguredError();
  }
  // Remove trailing slash se tiver
  return {
    baseUrl: env.VOICE_WORKER_URL.replace(/\/$/, ""),
    apiKey: env.VOICE_WORKER_API_KEY,
  };
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const { apiKey } = getConfig();
  return {
    Authorization: `Bearer ${apiKey}`,
    // Ngrok free: pula a pagina de aviso HTML
    "ngrok-skip-browser-warning": "true",
    ...extra,
  };
}

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  if (!res.ok) {
    let detail: string;
    try {
      const body = (await res.json()) as { detail?: string };
      detail = body.detail ?? res.statusText;
    } catch {
      detail = res.statusText;
    }
    throw new VoiceWorkerError(res.status, detail);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** Liveness check. Usado pra mostrar se o worker esta up. */
export async function voiceHealth(): Promise<VoiceHealthResponse> {
  const { baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}/health`, {
    headers: authHeaders(),
    // /health nao requer auth, mas mandamos o header pra nao quebrar
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  return (await parseJsonOrThrow(res)) as VoiceHealthResponse;
}

/**
 * Envia uma amostra de audio pra extrair o embedding de voz do usuario.
 * A requisicao do browser envia um Blob; aqui repassamos como multipart.
 */
export async function voiceEnroll(
  audio: Blob,
  filename = "enrollment.webm",
): Promise<EnrollmentResponse> {
  const { baseUrl } = getConfig();
  const formData = new FormData();
  formData.append("audio", audio, filename);

  const res = await fetch(`${baseUrl}/enroll`, {
    method: "POST",
    headers: authHeaders(), // NAO definir Content-Type, fetch infere com boundary
    body: formData,
    // 2 minutos — enrollment e curto mas o worker pode estar carregando modelos
    signal: AbortSignal.timeout(120_000),
  });
  return (await parseJsonOrThrow(res)) as EnrollmentResponse;
}

/**
 * Processa uma reuniao completa: transcrever + diarizar + embeddings.
 * Pode demorar minutos pra reunioes longas (1h ~ 8-10 min de processamento).
 */
export async function voiceProcessMeeting(
  audio: Blob,
  filename = "meeting.webm",
): Promise<ProcessMeetingResponse> {
  const { baseUrl } = getConfig();
  const formData = new FormData();
  formData.append("audio", audio, filename);

  const res = await fetch(`${baseUrl}/process-meeting`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
    // 15 min — reunioes longas podem demorar
    signal: AbortSignal.timeout(15 * 60_000),
  });
  return (await parseJsonOrThrow(res)) as ProcessMeetingResponse;
}
