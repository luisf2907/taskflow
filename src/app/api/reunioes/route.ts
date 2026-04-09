/**
 * POST /api/reunioes
 *
 * Cria uma nova reuniao (status=pending) e devolve uma signed upload URL
 * pro Supabase Storage. O client faz PUT direto pro bucket, bypassando o
 * limite de body do Vercel.
 *
 * Body JSON:
 *   { workspace_id: string, titulo: string, descricao?: string, mime_type?: string }
 *
 * Response:
 *   {
 *     reuniao: { id, workspace_id, titulo, status, ... },
 *     upload: { path, signed_url, token_expires_at }
 *   }
 */
import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { applyRateLimit } from "@/lib/api-utils";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

const BUCKET = "reunioes-audio";
const UPLOAD_TTL_SECONDS = 10 * 60; // 10 min

const ALLOWED_MIME_PREFIXES = ["audio/", "video/"];

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, "reunioes-create", {
    maxRequests: 20,
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

  let body: {
    workspace_id?: string;
    titulo?: string;
    descricao?: string;
    mime_type?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  if (!body.workspace_id) {
    return NextResponse.json(
      { error: "workspace_id obrigatorio" },
      { status: 400 },
    );
  }
  if (!body.titulo || typeof body.titulo !== "string") {
    return NextResponse.json({ error: "titulo obrigatorio" }, { status: 400 });
  }
  if (body.titulo.length > 200) {
    return NextResponse.json(
      { error: "titulo maior que 200 caracteres" },
      { status: 400 },
    );
  }
  const mime = body.mime_type ?? "audio/webm";
  if (!ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
    return NextResponse.json(
      { error: `mime_type invalido: ${mime}` },
      { status: 400 },
    );
  }

  // Verificar que usuario e membro do workspace (defesa em profundidade;
  // a RLS de reunioes tambem vai barrar)
  const { count } = await supabase
    .from("workspace_usuarios")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", body.workspace_id)
    .eq("user_id", user.id);
  if (!count || count === 0) {
    return NextResponse.json(
      { error: "Voce nao e membro deste workspace" },
      { status: 403 },
    );
  }

  // Gera o path do arquivo no bucket: workspace_id/<uuid>.<ext>
  const ext = mime.split("/")[1]?.split(";")[0] || "webm";
  const reuniaoId = randomUUID();
  const audioPath = `${body.workspace_id}/${reuniaoId}.${ext}`;

  // Insere a reuniao (status=pending)
  const { data: reuniao, error: insertErr } = await supabase
    .from("reunioes")
    .insert({
      id: reuniaoId,
      workspace_id: body.workspace_id,
      titulo: body.titulo.trim(),
      descricao: body.descricao?.trim() || null,
      audio_path: audioPath,
      audio_mime: mime,
      status: "pending",
      criado_por: user.id,
    })
    .select(
      "id, workspace_id, titulo, descricao, audio_path, audio_mime, status, criado_em, criado_por",
    )
    .single();

  if (insertErr || !reuniao) {
    return NextResponse.json(
      { error: `Erro ao criar reuniao: ${insertErr?.message}` },
      { status: 500 },
    );
  }

  // Gera signed upload URL (service role pra poder mesmo com bucket privado)
  const admin = createServiceClient();
  const { data: uploadData, error: uploadErr } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(audioPath);

  if (uploadErr || !uploadData) {
    // Rollback: apaga a reuniao que acabamos de criar
    await admin.from("reunioes").delete().eq("id", reuniao.id);
    return NextResponse.json(
      { error: `Erro ao gerar upload URL: ${uploadErr?.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    reuniao,
    upload: {
      path: audioPath,
      signed_url: uploadData.signedUrl,
      token: uploadData.token,
      expires_in_seconds: UPLOAD_TTL_SECONDS,
    },
  });
}
