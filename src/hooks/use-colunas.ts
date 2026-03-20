"use client";

import { supabase } from "@/lib/supabase/client";
import { Coluna } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(quadroId: string) {
  return `colunas-${quadroId}`;
}

export function useColunas(quadroId: string) {
  const key = chave(quadroId);

  const { data: colunas = [], isLoading: carregando } = useSWR(key, async () => {
    const { data } = await supabase
      .from("colunas")
      .select("*")
      .eq("quadro_id", quadroId)
      .order("posicao");
    return (data || []) as Coluna[];
  });

  async function criar(nome: string) {
    const posicao = colunas.length;
    const { data } = await supabase
      .from("colunas")
      .insert({ nome, quadro_id: quadroId, posicao })
      .select()
      .single();
    if (data) globalMutate(key, [...colunas, data], false);
    return data;
  }

  async function atualizar(id: string, campos: Partial<Coluna>) {
    globalMutate(key, colunas.map((c) => (c.id === id ? { ...c, ...campos } : c)), false);

    const { data } = await supabase
      .from("colunas")
      .update(campos)
      .eq("id", id)
      .select()
      .single();
    if (data) globalMutate(key, colunas.map((c) => (c.id === id ? data : c)), false);
    return data;
  }

  async function excluir(id: string) {
    globalMutate(key, colunas.filter((c) => c.id !== id), false);
    await supabase.from("colunas").delete().eq("id", id);
  }

  async function reordenar(colunasReordenadas: Coluna[]) {
    globalMutate(key, colunasReordenadas, false);
    const updates = colunasReordenadas.map((c, i) => ({
      id: c.id,
      quadro_id: c.quadro_id,
      nome: c.nome,
      posicao: i,
      criado_em: c.criado_em,
    }));
    await supabase.from("colunas").upsert(updates);
  }

  return { colunas, carregando, criar, atualizar, excluir, reordenar };
}
