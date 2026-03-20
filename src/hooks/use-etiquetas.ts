"use client";

import { supabase } from "@/lib/supabase/client";
import { Etiqueta } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(quadroId: string) {
  return `etiquetas-${quadroId}`;
}

export function useEtiquetas(quadroId: string) {
  const key = chave(quadroId);

  const { data: etiquetas = [], isLoading: carregando } = useSWR(key, async () => {
    // Buscar etiquetas do quadro
    const { data: doQuadro } = await supabase
      .from("etiquetas")
      .select("*")
      .eq("quadro_id", quadroId)
      .order("criado_em");

    // Buscar workspace_id do quadro pra pegar etiquetas do workspace também
    const { data: quadro } = await supabase
      .from("quadros")
      .select("workspace_id")
      .eq("id", quadroId)
      .single();

    let doWorkspace: Etiqueta[] = [];
    if (quadro?.workspace_id) {
      const { data } = await supabase
        .from("etiquetas")
        .select("*")
        .eq("workspace_id", quadro.workspace_id)
        .order("criado_em");
      doWorkspace = (data || []) as Etiqueta[];
    }

    // Combinar sem duplicatas
    const todas = [...(doQuadro || []), ...doWorkspace];
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
      .insert({ quadro_id: quadroId, nome, cor })
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

  return { etiquetas, carregando, criar, atualizar, excluir };
}
