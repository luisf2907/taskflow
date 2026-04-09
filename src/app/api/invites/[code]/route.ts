import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: validar link (publico — retorna info do workspace)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const service = createServiceClient();

  const { data: invite } = await service
    .from("invite_links")
    .select("id, workspace_id, expira_em, ativo, workspaces(nome, cor, icone)")
    .eq("code", code)
    .eq("ativo", true)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Link invalido ou expirado" }, { status: 404 });
  }

  if (new Date(invite.expira_em) < new Date()) {
    return NextResponse.json({ error: "Link expirado" }, { status: 410 });
  }

  const ws = invite.workspaces as unknown as { nome: string; cor: string; icone: string } | null;

  return NextResponse.json({
    workspace: {
      id: invite.workspace_id,
      nome: ws?.nome || "Workspace",
      cor: ws?.cor || "#00857A",
    },
  });
}

// POST: aceitar convite (requer auth)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const service = createServiceClient();

  // Buscar invite
  const { data: invite } = await service
    .from("invite_links")
    .select("id, workspace_id, expira_em, ativo")
    .eq("code", code)
    .eq("ativo", true)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Link invalido ou expirado" }, { status: 404 });
  }

  if (new Date(invite.expira_em) < new Date()) {
    return NextResponse.json({ error: "Link expirado" }, { status: 410 });
  }

  // Verificar se ja e membro
  const { data: existente } = await service
    .from("workspace_usuarios")
    .select("id")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existente) {
    return NextResponse.json({ ok: true, workspace_id: invite.workspace_id, already_member: true });
  }

  // Adicionar como membro
  const { error } = await service
    .from("workspace_usuarios")
    .insert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      papel: "membro",
    });

  if (error) {
    return NextResponse.json({ error: "Erro ao entrar no workspace" }, { status: 500 });
  }

  // Criar/atualizar membro na tabela membros (para atribuicao de cards).
  // Pode existir um membro com mesmo email mas user_id=null (criado antes
  // do signup). Nesse caso, fazemos update para vincular ao user.
  const { data: perfil } = await service
    .from("perfis")
    .select("nome, email, avatar_url")
    .eq("id", user.id)
    .single();

  if (perfil) {
    // Tenta encontrar membro existente pelo email (pode ter user_id null)
    const { data: membroExistente } = await service
      .from("membros")
      .select("id")
      .eq("workspace_id", invite.workspace_id)
      .eq("email", perfil.email)
      .maybeSingle();

    if (membroExistente) {
      // Vincular membro existente ao user
      await service
        .from("membros")
        .update({
          user_id: user.id,
          nome: perfil.nome || perfil.email || "Membro",
          avatar_url: perfil.avatar_url,
        })
        .eq("id", membroExistente.id);
    } else {
      // Criar novo membro
      await service.from("membros").upsert(
        {
          workspace_id: invite.workspace_id,
          user_id: user.id,
          nome: perfil.nome || perfil.email || "Membro",
          email: perfil.email,
          avatar_url: perfil.avatar_url,
        },
        { onConflict: "workspace_id,user_id" }
      );
    }
  }

  return NextResponse.json({ ok: true, workspace_id: invite.workspace_id });
}
