/**
 * POST /api/voice/enroll
 *
 * Recebe um audio de amostra (multipart/form-data field "audio"), encaminha
 * para o worker de voz, e salva o embedding retornado em perfis.voice_embedding.
 *
 * Exige:
 *   - usuario autenticado
 *   - consentimento LGPD aceito no corpo (campo "consent=true")
 *     OU ja registrado em perfis.voice_consent_at
 *
 * Este endpoint eh o proxy entre o browser e o FastAPI worker. Mantem a
 * VOICE_WORKER_API_KEY server-side.
 */
import { NextRequest, NextResponse } from "next/server";

import { applyRateLimitAsync } from "@/lib/api-utils";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import {
  voiceEnroll,
  VoiceWorkerError,
  VoiceWorkerNotConfiguredError,
} from "@/lib/voice/client";

// Limites sane pra audio de enrollment (10s minimo, 120s maximo)
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIMES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "video/webm", // alguns browsers retornam isso mesmo pra audio-only
  "application/octet-stream", // fallback
]);

export async function POST(request: NextRequest) {
  const limited = await applyRateLimitAsync(request, "voice-enroll", {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 10 por hora por IP
  });
  if (limited) return limited;

  // 1) Auth
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Nao autenticado" },
      { status: 401 },
    );
  }

  // 2) Parse multipart
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Body invalido (espera multipart/form-data)" },
      { status: 400 },
    );
  }

  const file = formData.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Campo 'audio' ausente ou invalido" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "Arquivo de audio vazio" },
      { status: 400 },
    );
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: `Arquivo maior que ${MAX_AUDIO_BYTES / 1024 / 1024} MB` },
      { status: 413 },
    );
  }
  if (file.type && !ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: `Tipo de arquivo nao suportado: ${file.type}` },
      { status: 415 },
    );
  }

  // 3) Consentimento LGPD
  // Aceita via "consent=true" no form, OU se ja houver perfis.voice_consent_at
  const consentFlag = formData.get("consent");
  const consentFromForm =
    typeof consentFlag === "string" && consentFlag === "true";

  const { data: perfil, error: perfilErr } = await supabase
    .from("perfis")
    .select("voice_consent_at")
    .eq("id", user.id)
    .maybeSingle();
  if (perfilErr) {
    return NextResponse.json(
      { error: "Erro ao ler perfil" },
      { status: 500 },
    );
  }

  const alreadyConsented = Boolean(perfil?.voice_consent_at);
  if (!alreadyConsented && !consentFromForm) {
    return NextResponse.json(
      {
        error:
          "Consentimento obrigatorio. Envie 'consent=true' junto do audio.",
      },
      { status: 400 },
    );
  }

  // 4) Encaminha pro worker
  let workerResponse;
  try {
    workerResponse = await voiceEnroll(file, file.name || "enrollment.webm");
  } catch (err) {
    if (err instanceof VoiceWorkerNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "Feature de voz nao configurada (VOICE_WORKER_URL ausente no servidor)",
        },
        { status: 503 },
      );
    }
    if (err instanceof VoiceWorkerError) {
      return NextResponse.json(
        { error: `Worker de voz recusou: ${err.detail}` },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Falha ao chamar worker: ${message}` },
      { status: 502 },
    );
  }

  // 5) Verifica qualidade
  if (!workerResponse.quality_ok) {
    return NextResponse.json(
      {
        error: workerResponse.quality_reason ?? "Audio de baixa qualidade",
        duration_s: workerResponse.duration_s,
        speech_s: workerResponse.speech_s,
      },
      { status: 422 },
    );
  }

  // 6) Grava no banco
  // Como a coluna voice_embedding e vector(256), podemos mandar direto
  // como JSON array (Supabase serializa pra pgvector automaticamente via ::vector).
  // Usamos service client pra garantir que o update passa (evita
  // quaisquer policies que proibam mudanca em perfis.voice_embedding).
  const admin = createServiceClient();

  const nowIso = new Date().toISOString();
  const updatePayload: {
    voice_embedding: string;
    voice_enrolled_at: string;
    voice_consent_at?: string;
  } = {
    // pgvector aceita formato "[n1,n2,...]" em texto
    voice_embedding: `[${workerResponse.embedding.join(",")}]`,
    voice_enrolled_at: nowIso,
  };
  if (!alreadyConsented) {
    updatePayload.voice_consent_at = nowIso;
  }

  const { error: updateErr } = await admin
    .from("perfis")
    .update(updatePayload)
    .eq("id", user.id);

  if (updateErr) {
    return NextResponse.json(
      { error: `Erro ao salvar embedding: ${updateErr.message}` },
      { status: 500 },
    );
  }

  // 7) Sucesso
  return NextResponse.json({
    ok: true,
    duration_s: workerResponse.duration_s,
    speech_s: workerResponse.speech_s,
    embedding_dim: workerResponse.embedding_dim,
    embedding_model: workerResponse.embedding_model,
    enrolled_at: nowIso,
    consent_at: alreadyConsented ? perfil?.voice_consent_at : nowIso,
  });
}

/**
 * DELETE /api/voice/enroll
 *
 * LGPD — direito ao esquecimento. Apaga o embedding de voz do usuario
 * e (opcionalmente) tambem revoga o consentimento.
 */
export async function DELETE(request: NextRequest) {
  const limited = await applyRateLimitAsync(request, "voice-enroll-delete", {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  // Query params: ?revokeConsent=true pra zerar o consentimento tambem
  const revokeConsent = request.nextUrl.searchParams.get("revokeConsent") === "true";

  const admin = createServiceClient();
  const update: {
    voice_embedding: null;
    voice_enrolled_at: null;
    voice_consent_at?: null;
  } = {
    voice_embedding: null,
    voice_enrolled_at: null,
  };
  if (revokeConsent) update.voice_consent_at = null;

  const { error } = await admin
    .from("perfis")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: `Erro ao apagar embedding: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, revokedConsent: revokeConsent });
}
