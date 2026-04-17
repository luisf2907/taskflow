/**
 * POST /api/reunioes/[id]/process
 *
 * Dispara o processamento async no worker de voz. Assumindo que o client
 * ja fez o upload do audio pro Supabase Storage, esta rota:
 *
 *   1. Verifica que a reuniao existe e pertence a um workspace do usuario
 *   2. Verifica que o audio_path existe no bucket (sanity check)
 *   3. Gera signed READ URL pro worker baixar (15 min TTL)
 *   4. Gera HMAC token = hmac(secret, reuniao_id)
 *   5. Chama voiceProcessMeetingAsync com o URL + token + callback URL
 *   6. Atualiza status da reuniao pra "processing"
 *   7. Retorna 202 imediatamente
 *
 * O worker vai processar e POSTar resultado em /api/reunioes/[id]/webhook.
 */
import { NextRequest, NextResponse } from "next/server";

import { applyRateLimitAsync } from "@/lib/api-utils";
import { getPublicEnv } from "@/lib/env";
import { getStorageDriver } from "@/lib/drivers/storage/factory";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import {
  voiceProcessMeetingAsync,
  VoiceWorkerError,
  VoiceWorkerNotConfiguredError,
} from "@/lib/voice/client";
import {
  signReuniaoToken,
  WebhookSecretNotConfiguredError,
} from "@/lib/voice/webhook-token";

const BUCKET = "reunioes-audio";
const READ_TTL_SECONDS = 15 * 60; // 15 min

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await applyRateLimitAsync(request, "reunioes-process", {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000,
  });
  if (limited) return limited;

  const { id: reuniaoId } = await context.params;
  if (!reuniaoId) {
    return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  // RLS garante que so vemos reunioes de workspaces que participamos
  const { data: reuniao, error: fetchErr } = await supabase
    .from("reunioes")
    .select("id, workspace_id, audio_path, status")
    .eq("id", reuniaoId)
    .maybeSingle();
  if (fetchErr) {
    return NextResponse.json(
      { error: `Erro ao ler reuniao: ${fetchErr.message}` },
      { status: 500 },
    );
  }
  if (!reuniao) {
    return NextResponse.json(
      { error: "Reuniao nao encontrada" },
      { status: 404 },
    );
  }
  if (!reuniao.audio_path) {
    return NextResponse.json(
      { error: "Reuniao sem audio_path (upload nao foi feito?)" },
      { status: 400 },
    );
  }
  if (reuniao.status === "processing") {
    return NextResponse.json(
      { ok: true, reuniao_id: reuniao.id, status: "processing", note: "ja em processamento" },
    );
  }

  // Gera signed read URL via driver — worker baixa o audio via URL assinada
  const admin = createServiceClient();
  let signedAudioUrl: string;
  try {
    signedAudioUrl = await getStorageDriver().createSignedDownloadUrl(
      BUCKET,
      reuniao.audio_path,
      READ_TTL_SECONDS,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "desconhecido";
    return NextResponse.json(
      { error: `Erro ao gerar signed URL: ${msg}` },
      { status: 500 },
    );
  }

  // HMAC token
  let callbackToken: string;
  try {
    callbackToken = signReuniaoToken(reuniaoId);
  } catch (err) {
    if (err instanceof WebhookSecretNotConfiguredError) {
      return NextResponse.json(
        { error: "VOICE_WEBHOOK_SECRET ausente no servidor" },
        { status: 503 },
      );
    }
    throw err;
  }

  // Monta callback_url a partir do host do request (mais robusto que
  // depender de NEXT_PUBLIC_SITE_URL em producao). Fallback pra env.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const baseUrl =
    host && proto
      ? `${proto}://${host}`
      : (getPublicEnv().NEXT_PUBLIC_SITE_URL ?? "");
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Nao foi possivel determinar o callback URL" },
      { status: 500 },
    );
  }
  const callbackUrl = `${baseUrl}/api/reunioes/${reuniaoId}/webhook`;

  // Dispara o worker (async, retorna 202 rapidamente)
  try {
    await voiceProcessMeetingAsync({
      audioUrl: signedAudioUrl,
      reuniaoId,
      callbackUrl,
      callbackToken,
    });
  } catch (err) {
    if (err instanceof VoiceWorkerNotConfiguredError) {
      return NextResponse.json(
        { error: "VOICE_WORKER_URL ausente no servidor" },
        { status: 503 },
      );
    }
    if (err instanceof VoiceWorkerError) {
      // Marca a reuniao como error
      await admin
        .from("reunioes")
        .update({ status: "error", erro_mensagem: err.detail })
        .eq("id", reuniaoId);
      return NextResponse.json(
        { error: `Worker recusou: ${err.detail}` },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    await admin
      .from("reunioes")
      .update({ status: "error", erro_mensagem: message })
      .eq("id", reuniaoId);
    return NextResponse.json(
      { error: `Falha ao chamar worker: ${message}` },
      { status: 502 },
    );
  }

  // Atualiza status pra "processing"
  const { error: updateErr } = await admin
    .from("reunioes")
    .update({ status: "processing", erro_mensagem: null })
    .eq("id", reuniaoId);
  if (updateErr) {
    return NextResponse.json(
      { error: `Erro ao atualizar status: ${updateErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, reuniao_id: reuniaoId, status: "processing" },
    { status: 202 },
  );
}
