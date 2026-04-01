"use client";

import { supabase } from "@/lib/supabase/client";
import { Membro } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";
import { useEffect, useRef } from "react";

const CORES_AVATAR = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#3B82F6", "#6366F1", "#A855F7", "#EC4899", "#78716C",
];

function chave(workspaceId: string) {
  return `membros-ws-${workspaceId}`;
}

export function useMembrosWorkspace(workspaceId: string) {
  const key = workspaceId ? chave(workspaceId) : null;
  const sincronizou = useRef(false);

  const { data: membros = [], isLoading: carregando } = useSWR(key, async () => {
    const { data } = await supabase
      .from("membros")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("criado_em");
    return (data || []) as Membro[];
  });

  // Auto-sincronizar membros com workspace_usuarios
  // Cria entradas na tabela "membros" para cada user do workspace que ainda não tem
  useEffect(() => {
    if (carregando || sincronizou.current || !workspaceId) return;
    sincronizou.current = true;

    (async () => {
      // Buscar usuários do workspace com perfis
      const { data: wsUsuarios } = await supabase
        .from("workspace_usuarios")
        .select("user_id")
        .eq("workspace_id", workspaceId);

      if (!wsUsuarios || wsUsuarios.length === 0) return;

      const userIds = wsUsuarios.map((u) => u.user_id);
      const { data: perfis } = await supabase
        .from("perfis")
        .select("id, nome, email, avatar_url")
        .in("id", userIds);

      if (!perfis || perfis.length === 0) return;

      // Verificar quais já existem como membros (por user_id)
      const membrosExistentes = new Set(
        membros
          .filter((m) => m.user_id)
          .map((m) => m.user_id)
      );

      // Também checar por email para não duplicar membros antigos criados manualmente
      const emailsExistentes = new Set(
        membros
          .filter((m) => m.email)
          .map((m) => m.email!.toLowerCase())
      );

      const novos = perfis.filter((p) => {
        if (membrosExistentes.has(p.id)) return false;
        if (p.email && emailsExistentes.has(p.email.toLowerCase())) return false;
        return true;
      });

      if (novos.length === 0) return;

      // Criar membros para os novos
      const inserts = novos.map((p, i) => ({
        workspace_id: workspaceId,
        quadro_id: null,
        nome: p.nome || p.email || "Membro",
        email: p.email,
        cor_avatar: CORES_AVATAR[(membros.length + i) % CORES_AVATAR.length],
        avatar_url: p.avatar_url || null,
        user_id: p.id,
      }));

      const { data: criados } = await supabase
        .from("membros")
        .upsert(inserts, { onConflict: "user_id,workspace_id", ignoreDuplicates: true })
        .select();

      if (criados && criados.length > 0) {
        globalMutate(key, [...membros, ...criados.filter((c) => !membrosExistentes.has(c.user_id))], false);
      }
    })();
  }, [carregando, workspaceId, membros, key]);

  async function criar(nome: string, email?: string) {
    const cor = CORES_AVATAR[membros.length % CORES_AVATAR.length];
    const { data } = await supabase
      .from("membros")
      .insert({ workspace_id: workspaceId, quadro_id: null, nome, email: email || null, cor_avatar: cor })
      .select()
      .single();
    if (data) globalMutate(key, [...membros, data], false);
    return data;
  }

  async function atualizar(id: string, campos: Partial<Pick<Membro, "nome" | "email" | "cor_avatar">>) {
    globalMutate(key, membros.map((m) => (m.id === id ? { ...m, ...campos } : m)), false);
    const { data } = await supabase.from("membros").update(campos).eq("id", id).select().single();
    if (data) globalMutate(key, membros.map((m) => (m.id === id ? data : m)), false);
    return data;
  }

  async function excluir(id: string) {
    globalMutate(key, membros.filter((m) => m.id !== id), false);
    await supabase.from("membros").delete().eq("id", id);
  }

  function buscar() {
    globalMutate(key);
  }

  return { membros, carregando, criar, atualizar, excluir, buscar };
}
