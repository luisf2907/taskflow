"use client";

import { supabase } from "@/lib/supabase/client";
import { WorkspaceUsuario } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(workspaceId: string | undefined) {
  return workspaceId ? `workspace-usuarios-${workspaceId}` : null;
}

export function useWorkspaceUsuarios(workspaceId: string | undefined) {
  const { data: usuarios = [], isLoading: carregando } = useSWR(
    chave(workspaceId),
    async () => {
      const { data } = await supabase
        .from("workspace_usuarios")
        .select("*, perfis(*)")
        .eq("workspace_id", workspaceId!)
        .order("criado_em");
      return (data || []) as WorkspaceUsuario[];
    }
  );

  async function convidar(email: string) {
    // Buscar perfil pelo email
    const { data: perfil } = await supabase
      .from("perfis")
      .select("id")
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
      .select("*, perfis(*)")
      .single();

    if (error) return { error: error.message };

    globalMutate(chave(workspaceId), [...usuarios, data], false);
    return { data };
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
