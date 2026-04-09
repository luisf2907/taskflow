/**
 * POST /api/reunioes/[id]/webhook
 *
 * Endpoint chamado PELO WORKER quando termina de processar uma reuniao.
 * Autenticacao via HMAC token no header Authorization: Bearer <hex>
 *
 *   expected = hmac_sha256(VOICE_WEBHOOK_SECRET, reuniao_id)
 *
 * Payload esperado:
 *   sucesso:
 *     { reuniao_id, status: "done", result: ProcessMeetingResponse }
 *   erro:
 *     { reuniao_id, status: "error", error: string }
 *
 * O que faz em caso de sucesso:
 *   1. Insere linhas em reuniao_falas (uma por segmento transcrito)
 *   2. Pra cada speaker com embedding valido, chama o RPC
 *      match_voice_profiles() pra tentar identificar quem e
 *   3. Atualiza a reunioes.status=done + metadados (duracao, language, timings)
 */
import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import type {
  ProcessMeetingResponse,
  TranscriptSegment,
} from "@/lib/voice/client";
import {
  extractBearerToken,
  verifyReuniaoToken,
} from "@/lib/voice/webhook-token";

interface WebhookSuccessPayload {
  reuniao_id: string;
  status: "done";
  result: ProcessMeetingResponse;
}

interface WebhookErrorPayload {
  reuniao_id: string;
  status: "error";
  error: string;
}

type WebhookPayload = WebhookSuccessPayload | WebhookErrorPayload;

// Threshold local pra decidir se um match e "forte" ou "fraco".
// Deve bater com o que esta no worker (match_threshold_strong/weak).
const MATCH_STRONG = 0.7;
const MATCH_WEAK = 0.5;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: reuniaoIdFromUrl } = await context.params;
  if (!reuniaoIdFromUrl) {
    return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  }

  // 1) Auth via HMAC
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json(
      { error: "Authorization ausente" },
      { status: 401 },
    );
  }
  if (!verifyReuniaoToken(reuniaoIdFromUrl, token)) {
    return NextResponse.json({ error: "token invalido" }, { status: 401 });
  }

  // 2) Parse payload
  let payload: WebhookPayload;
  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "body invalido" }, { status: 400 });
  }

  // Sanity: o id no body tem que bater com o da URL
  if (payload.reuniao_id !== reuniaoIdFromUrl) {
    return NextResponse.json(
      { error: "reuniao_id do payload nao bate com a URL" },
      { status: 400 },
    );
  }

  const admin = createServiceClient();

  // Le a reuniao pra conseguir o workspace_id (necessario pro matching)
  const { data: reuniao, error: fetchErr } = await admin
    .from("reunioes")
    .select("id, workspace_id, status")
    .eq("id", reuniaoIdFromUrl)
    .maybeSingle();
  if (fetchErr || !reuniao) {
    return NextResponse.json(
      {
        error: `reuniao nao encontrada: ${fetchErr?.message ?? "not found"}`,
      },
      { status: 404 },
    );
  }

  // 3) Erro vindo do worker
  if (payload.status === "error") {
    await admin
      .from("reunioes")
      .update({
        status: "error",
        erro_mensagem: payload.error,
        processado_em: new Date().toISOString(),
      })
      .eq("id", reuniao.id);
    return NextResponse.json({ ok: true, recorded_as: "error" });
  }

  // 4) Sucesso: grava segments + faz matching por speaker
  const result = payload.result;

  // 4a) Matching: pra cada speaker com embedding, chama o RPC
  // match_voice_profiles(workspace_id, embedding, limit=1) pra achar o top-1.
  // Monta um map speaker_label -> { usuario_id, similarity, match_tipo }
  const speakerMatches = new Map<
    string,
    {
      usuario_id: string | null;
      similarity: number | null;
      match_tipo: "strong" | "weak" | "none";
    }
  >();

  for (const speaker of result.speakers) {
    if (speaker.skipped || !speaker.embedding || speaker.embedding.length === 0) {
      speakerMatches.set(speaker.label, {
        usuario_id: null,
        similarity: null,
        match_tipo: "none",
      });
      continue;
    }

    // pgvector aceita `[n1,n2,...]` como input
    const embeddingLiteral = `[${speaker.embedding.join(",")}]`;
    const { data: matches, error: rpcErr } = await admin.rpc(
      "match_voice_profiles",
      {
        p_workspace_id: reuniao.workspace_id,
        p_embedding: embeddingLiteral,
        p_limit: 1,
      },
    );
    if (rpcErr) {
      speakerMatches.set(speaker.label, {
        usuario_id: null,
        similarity: null,
        match_tipo: "none",
      });
      continue;
    }
    const top = Array.isArray(matches) && matches.length > 0 ? matches[0] : null;
    if (!top) {
      speakerMatches.set(speaker.label, {
        usuario_id: null,
        similarity: null,
        match_tipo: "none",
      });
      continue;
    }
    const sim = Number(top.similarity);
    let matchTipo: "strong" | "weak" | "none" = "none";
    if (sim >= MATCH_STRONG) matchTipo = "strong";
    else if (sim >= MATCH_WEAK) matchTipo = "weak";

    speakerMatches.set(speaker.label, {
      usuario_id: matchTipo === "none" ? null : top.usuario_id,
      similarity: sim,
      match_tipo: matchTipo,
    });
  }

  // 4b) Insert falas (limpa as existentes primeiro, caso seja re-processamento)
  await admin.from("reuniao_falas").delete().eq("reuniao_id", reuniao.id);

  if (result.segments.length > 0) {
    const rows = result.segments.map(
      (seg: TranscriptSegment, idx: number) => {
        const match = speakerMatches.get(seg.speaker);
        return {
          reuniao_id: reuniao.id,
          ordem: idx,
          inicio_ms: Math.round(seg.start * 1000),
          fim_ms: Math.round(seg.end * 1000),
          speaker_label: seg.speaker,
          usuario_id: match?.usuario_id ?? null,
          match_confianca: match?.similarity ?? null,
          match_tipo: match?.match_tipo ?? "none",
          texto: seg.text,
        };
      },
    );

    // Insert em batch
    const { error: insertErr } = await admin
      .from("reuniao_falas")
      .insert(rows);
    if (insertErr) {
      await admin
        .from("reunioes")
        .update({
          status: "error",
          erro_mensagem: `Falha ao gravar falas: ${insertErr.message}`,
          processado_em: new Date().toISOString(),
        })
        .eq("id", reuniao.id);
      return NextResponse.json(
        { error: `Erro ao inserir falas: ${insertErr.message}` },
        { status: 500 },
      );
    }
  }

  // 4c) Atualiza a reuniao pra "done" com metadados
  const { error: updateErr } = await admin
    .from("reunioes")
    .update({
      status: "done",
      erro_mensagem: null,
      duracao_seg: result.duration_s,
      language: result.language,
      language_probability: result.language_probability,
      timings_ms: result.timings_ms,
      processado_em: new Date().toISOString(),
    })
    .eq("id", reuniao.id);
  if (updateErr) {
    return NextResponse.json(
      { error: `Erro ao atualizar status: ${updateErr.message}` },
      { status: 500 },
    );
  }

  // Sanity log (viavel em logs da vercel)
  const matchCounts = {
    strong: [...speakerMatches.values()].filter((m) => m.match_tipo === "strong").length,
    weak: [...speakerMatches.values()].filter((m) => m.match_tipo === "weak").length,
    none: [...speakerMatches.values()].filter((m) => m.match_tipo === "none").length,
  };
  console.log(
    `[voice-webhook] reuniao=${reuniao.id} done: ${result.segments.length} segments, ${result.speakers.length} speakers, matches=${JSON.stringify(matchCounts)}`,
  );

  return NextResponse.json({
    ok: true,
    recorded_as: "done",
    segments: result.segments.length,
    speakers: result.speakers.length,
    matches: matchCounts,
  });
}
