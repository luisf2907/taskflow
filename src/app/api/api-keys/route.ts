import { createServerClient } from "@/lib/supabase/server";
import { applyRateLimit } from "@/lib/api-utils";
import { generateApiKey, hashApiKey } from "@/lib/mcp-auth";
import { NextRequest, NextResponse } from "next/server";

// GET — listar API keys do usuario (mascaradas)
export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, "api-keys-list", { maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, workspace_id, key_prefix, nome, ultimo_uso, criado_em, expires_at")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false });

  return NextResponse.json({ keys: keys || [] });
}

// POST — gerar nova API key
export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, "api-keys-create", { maxRequests: 5, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: { nome?: string; workspace_id?: string; expires_in_days?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  const { nome, workspace_id, expires_in_days } = body;

  if (!workspace_id) {
    return NextResponse.json({ error: "workspace_id obrigatorio" }, { status: 400 });
  }

  // Verificar que usuario e membro do workspace
  const { count } = await supabase
    .from("workspace_usuarios")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace_id)
    .eq("user_id", user.id);

  if (!count || count === 0) {
    return NextResponse.json({ error: "Voce nao e membro deste workspace" }, { status: 403 });
  }

  // Limitar a 5 keys por usuario
  const { count: totalKeys } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (totalKeys && totalKeys >= 5) {
    return NextResponse.json({ error: "Limite de 5 API keys atingido. Revogue uma antes." }, { status: 400 });
  }

  // Gerar key
  const plainKey = generateApiKey();
  const keyHash = hashApiKey(plainKey);
  const keyPrefix = plainKey.slice(0, 12); // tf_sk_XXXX

  // Calcular expiração (null = sem expiração)
  let expires_at: string | null = null;
  if (expires_in_days && expires_in_days > 0) {
    const d = new Date();
    d.setDate(d.getDate() + expires_in_days);
    expires_at = d.toISOString();
  }

  const { data: created, error } = await supabase
    .from("api_keys")
    .insert({
      workspace_id,
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      nome: nome || "API Key",
      expires_at,
    })
    .select("id, workspace_id, key_prefix, nome, criado_em, expires_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Erro ao criar API key" }, { status: 500 });
  }

  // Retorna key completa UMA UNICA VEZ
  return NextResponse.json({
    key: plainKey,
    ...created,
    aviso: "Salve esta key — ela nao sera mostrada novamente.",
  });
}

// DELETE — revogar API key
export async function DELETE(request: NextRequest) {
  const limited = applyRateLimit(request, "api-keys-delete", { maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id da key obrigatorio" }, { status: 400 });
  }

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Erro ao revogar key" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
