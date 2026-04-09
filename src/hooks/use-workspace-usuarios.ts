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
        .select(
          "id, nome, email, avatar_url, github_username, notif_preferences, onboarding_done, onboarding_step, criado_em, atualizado_em, voice_enrolled_at, voice_consent_at, theme_preferences",
        )
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
    // Usa API route com service role para buscar perfil por email
    // (RLS impede client de ver perfis de quem nao e do mesmo workspace)
    try {
      const res = await fetch("/api/workspace-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          workspace_id: workspaceId,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        return { error: result.error || "Erro ao convidar" };
      }

      const novoUsuario = result.data as WorkspaceUsuario;
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
    } catch {
      return { error: "Erro de conexao" };
    }
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
