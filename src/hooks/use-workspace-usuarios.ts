"use client";

import { supabase } from "@/lib/supabase/client";
import { WorkspaceUsuario, Perfil } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(workspaceId: string | undefined) {
  return workspaceId ? `workspace-usuarios-${workspaceId}` : null;
}

export function useWorkspaceUsuarios(workspaceId: string | undefined) {
  const { data: usuarios = [], isLoading: carregando } = useSWR(
    chave(workspaceId),
    async () => {
      // 1. Buscar membros do workspace
      const { data: membros } = await supabase
        .from("workspace_usuarios")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("criado_em");

      if (!membros || membros.length === 0) return [] as WorkspaceUsuario[];

      // 2. Buscar perfis dos user_ids
      const userIds = membros.map((m) => m.user_id);
      const { data: perfis } = await supabase
        .from("perfis")
        .select("*")
        .in("id", userIds);

      const perfisMap = new Map<string, Perfil>();
      (perfis || []).forEach((p) => perfisMap.set(p.id, p as Perfil));

      // 3. Juntar
      return membros.map((m) => ({
        ...m,
        perfis: perfisMap.get(m.user_id) || undefined,
      })) as WorkspaceUsuario[];
    }
  );

  async function convidar(email: string) {
    // Buscar perfil pelo email
    const { data: perfil } = await supabase
      .from("perfis")
      .select("*")
      .eq("email", email)
      .single();

    if (!perfil) {
      return { error: "Usuário não encontrado. Peça para ele se cadastrar primeiro." };
    }

    // Verificar se já é membro
    const jaExiste = usuarios.some((u) => u.user_id === perfil.id);
    if (jaExiste) {
      return { error: "Este usuário já é membro deste workspace." };
    }

    const { data, error } = await supabase
      .from("workspace_usuarios")
      .insert({
        workspace_id: workspaceId!,
        user_id: perfil.id,
        papel: "membro",
      })
      .select("*")
      .single();

    if (error) return { error: error.message };

    const novoUsuario: WorkspaceUsuario = {
      ...data,
      perfis: perfil as Perfil,
    };

    globalMutate(chave(workspaceId), [...usuarios, novoUsuario], false);

    // Enviar email de convite (fire-and-forget)
    const { data: ws } = await supabase
      .from("workspaces")
      .select("nome")
      .eq("id", workspaceId!)
      .single();

    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "convite",
        destinatario: email,
        dados: { nomeWorkspace: ws?.nome || "Workspace" },
      }),
    }).catch(() => {});

    return { data: novoUsuario };
  }

  async function remover(usuarioId: string) {
    globalMutate(
      chave(workspaceId),
      usuarios.filter((u) => u.id !== usuarioId),
      false
    );
    await supabase.from("workspace_usuarios").delete().eq("id", usuarioId);
  }

  async function alterarPapel(usuarioId: string, papel: "admin" | "membro") {
    globalMutate(
      chave(workspaceId),
      usuarios.map((u) => (u.id === usuarioId ? { ...u, papel } : u)),
      false
    );
    await supabase
      .from("workspace_usuarios")
      .update({ papel })
      .eq("id", usuarioId);
  }

  return { usuarios, carregando, convidar, remover, alterarPapel };
}
