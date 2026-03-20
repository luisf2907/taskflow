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
    // Buscar etiquetas diretas do workspace
    const { data: diretas } = await supabase
      .from("etiquetas")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("criado_em");

    // Buscar etiquetas dos quadros do workspace
    const { data: quadrosWs } = await supabase
      .from("quadros")
      .select("id")
      .eq("workspace_id", workspaceId);

    const quadroIds = (quadrosWs || []).map((q) => q.id);

    let deQuadros: Etiqueta[] = [];
    if (quadroIds.length > 0) {
      const { data } = await supabase
        .from("etiquetas")
        .select("*")
        .in("quadro_id", quadroIds)
        .order("criado_em");
      deQuadros = (data || []) as Etiqueta[];
    }

    // Combinar sem duplicatas
    const todas = [...(diretas || []), ...deQuadros];
    const ids = new Set<string>();
    return todas.filter((e) => {
      if (ids.has(e.id)) return false;
      ids.add(e.id);
      return true;
    }) as Etiqueta[];
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

  async function excluir(id: string) {
    globalMutate(key, etiquetas.filter((e) => e.id !== id), false);
    await supabase.from("etiquetas").delete().eq("id", id);
  }

  function buscar() {
    globalMutate(key);
  }

  return { etiquetas, carregando, criar, excluir, buscar };
}
