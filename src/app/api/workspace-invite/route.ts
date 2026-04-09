import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { applyRateLimit } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/workspace-invite
 * Convida um usuario pelo email para um workspace.
 *
 * Usa service role para buscar perfil por email (RLS impede client de ver
 * perfis de usuarios que ainda nao sao membros do mesmo workspace).
 */
export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, "workspace-invite", {
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  // Auth — usuario precisa estar logado
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  // Body
  let body: { email?: string; workspace_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const workspaceId = body.workspace_id;

  if (!email || !workspaceId) {
    return NextResponse.json(
      { error: "email e workspace_id obrigatorios" },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  // Verificar que o usuario logado e admin do workspace
  const { data: meuPapel } = await service
    .from("workspace_usuarios")
    .select("papel")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!meuPapel) {
    return NextResponse.json(
      { error: "Voce nao pertence a este workspace" },
      { status: 403 }
    );
  }

  // Buscar perfil pelo email (service role bypassa RLS)
  const { data: perfil } = await service
    .from("perfis")
    .select(
      "id, nome, email, avatar_url, github_username, notif_preferences, onboarding_done, onboarding_step, criado_em, atualizado_em, voice_enrolled_at, voice_consent_at"
    )
    .eq("email", email)
    .maybeSingle();

  if (!perfil) {
    return NextResponse.json(
      {
        error:
          "Usuario nao encontrado. Peca para ele se cadastrar primeiro.",
      },
      { status: 404 }
    );
  }

  // Verificar se ja e membro
  const { data: jaExiste } = await service
    .from("workspace_usuarios")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", perfil.id)
    .maybeSingle();

  if (jaExiste) {
    return NextResponse.json(
      { error: "Este usuario ja e membro deste workspace." },
      { status: 409 }
    );
  }

  // Adicionar como membro
  const { data: novoWu, error: insertError } = await service
    .from("workspace_usuarios")
    .insert({
      workspace_id: workspaceId,
      user_id: perfil.id,
      papel: "membro",
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  // Criar/vincular membro na tabela membros
  const { data: membroExistente } = await service
    .from("membros")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .maybeSingle();

  if (membroExistente) {
    await service
      .from("membros")
      .update({
        user_id: perfil.id,
        nome: perfil.nome || perfil.email || "Membro",
        avatar_url: perfil.avatar_url,
      })
      .eq("id", membroExistente.id);
  } else {
    await service.from("membros").upsert(
      {
        workspace_id: workspaceId,
        user_id: perfil.id,
        nome: perfil.nome || perfil.email || "Membro",
        email: perfil.email,
        avatar_url: perfil.avatar_url,
      },
      { onConflict: "workspace_id,user_id" }
    );
  }

  return NextResponse.json({
    data: { ...novoWu, perfis: perfil },
  });
}
