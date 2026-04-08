"use client";

import { supabase } from "@/lib/supabase/client";
import { Membro } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

const CORES_AVATAR = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#3B82F6", "#6366F1", "#A855F7", "#EC4899", "#78716C",
];

function chave(workspaceId: string) {
  return `membros-ws-${workspaceId}`;
}

export function useMembrosWorkspace(workspaceId: string) {
  const key = workspaceId ? chave(workspaceId) : null;

  const { data: membros = [], isLoading: carregando } = useSWR(key, async () => {
    const { data } = await supabase
      .from("membros")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("criado_em");
    return (data || []) as Membro[];
  });

  // Nota: a sincronizacao workspace_usuarios → membros e feita por um trigger
  // no banco (trg_auto_sync_membro), ver migration 033. Nao fazemos mais
  // essa logica no client, que era fonte de duplicatas por race condition.

  async function criar(nome: string, email?: string) {
    const cor = CORES_AVATAR[membros.length % CORES_AVATAR.length];
    const { data } = await supabase
      .from("membros")
      .insert({ workspace_id: workspaceId, nome, email: email || null, cor_avatar: cor })
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
