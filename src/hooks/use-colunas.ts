"use client";

import { supabase } from "@/lib/supabase/client";
import { registrarAtividade } from "@/lib/atividades";
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
    // Check duplicata
    const duplicata = colunas.some((c) => c.nome.toLowerCase().trim() === nome.toLowerCase().trim());
    if (duplicata) return null; // Silently skip — UI should show feedback

    const posicao = colunas.length;
    const { data } = await supabase
      .from("colunas")
      .insert({ nome, quadro_id: quadroId, posicao })
      .select()
      .single();
    if (data) {
      globalMutate(key, [...colunas, data], false);
      registrarAtividade({ quadroId, acao: "criar", entidade: "coluna", detalhes: { nome } });
    }
    return data;
  }

  async function atualizar(id: string, campos: Partial<Coluna>) {
    const estadoAnterior = colunas;
    globalMutate(key, colunas.map((c) => (c.id === id ? { ...c, ...campos } : c)), false);

    const { data, error } = await supabase
      .from("colunas")
      .update(campos)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      // Rollback: restaurar estado anterior e revalidar
      globalMutate(key, estadoAnterior, { revalidate: true });
      return null;
    }

    globalMutate(key, colunas.map((c) => (c.id === id ? data : c)), false);
    registrarAtividade({ quadroId, acao: "atualizar", entidade: "coluna", detalhes: { campos: Object.keys(campos) } });
    return data;
  }

  async function excluir(id: string) {
    const coluna = colunas.find((c) => c.id === id);
    const nome = coluna?.nome;

    // Move cards desta coluna para backlog (coluna_id = null) antes de deletar
    await supabase.from("cartoes").update({ coluna_id: null }).eq("coluna_id", id);

    globalMutate(key, colunas.filter((c) => c.id !== id), false);
    await supabase.from("colunas").delete().eq("id", id);
    registrarAtividade({ quadroId, acao: "excluir", entidade: "coluna", detalhes: { nome } });
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
