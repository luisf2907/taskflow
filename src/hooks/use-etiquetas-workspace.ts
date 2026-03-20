"use client";

import { supabase } from "@/lib/supabase/client";
import { Etiqueta } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(workspaceId: string) {
  return `etiquetas-ws-${workspaceId}`;
}

export function useEtiquetasWorkspace(workspaceId: string) {
  const key = chave(workspaceId);

  const { data: etiquetas = [], isLoading: carregando } = useSWR(key, async () => {
    const { data } = await supabase
      .from("etiquetas")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("criado_em");
    return (data || []) as Etiqueta[];
  });

  async function criar(nome: string, cor: string) {
    const { data } = await supabase
      .from("etiquetas")
      .insert({ workspace_id: workspaceId, quadro_id: null, nome, cor })
      .select()
      .single();
    if (data) globalMutate(key, [...etiquetas, data], false);
    return data;
  }

  async function atualizar(id: string, campos: Partial<Pick<Etiqueta, "nome" | "cor">>) {
    globalMutate(key, etiquetas.map((e) => (e.id === id ? { ...e, ...campos } : e)), false);
    const { data } = await supabase.from("etiquetas").update(campos).eq("id", id).select().single();
    if (data) globalMutate(key, etiquetas.map((e) => (e.id === id ? data : e)), false);
    return data;
  }

  async function excluir(id: string) {
    globalMutate(key, etiquetas.filter((e) => e.id !== id), false);
    await supabase.from("etiquetas").delete().eq("id", id);
  }

  function buscar() {
    globalMutate(key);
  }

  return { etiquetas, carregando, criar, atualizar, excluir, buscar };
}
