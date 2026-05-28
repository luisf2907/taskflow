"use client";

import { supabase } from "@/lib/supabase/client";
import useSWR, { mutate as globalMutate } from "swr";

function chave(cartaoPaiId: string) {
  return `subtarefas-${cartaoPaiId}`;
}

export interface Subtarefa {
  id: string;
  titulo: string;
  data_conclusao: string | null;
  coluna_id: string | null;
  peso: number | null;
  workspace_id: string | null;
  cartao_pai_id: string | null;
  posicao: number;
  criado_em: string;
}

/** Subtarefas (cards filhos) de um cartão pai. */
export function useSubtarefas(cartaoPaiId: string | null, workspaceId: string | null) {
  const key = cartaoPaiId ? chave(cartaoPaiId) : null;

  const { data: subtarefas = [], isLoading: carregando } = useSWR(key, async () => {
    if (!cartaoPaiId) return [] as Subtarefa[];
    const { data } = await supabase
      .from("cartoes")
      .select("id, titulo, data_conclusao, coluna_id, peso, workspace_id, cartao_pai_id, posicao, criado_em")
      .eq("cartao_pai_id", cartaoPaiId)
      .order("posicao", { ascending: true })
      .order("criado_em", { ascending: true });
    return (data || []) as Subtarefa[];
  });

  /** Cria uma subtarefa no backlog (sem coluna) já vinculada ao pai. */
  async function criarRapida(titulo: string) {
    if (!cartaoPaiId || !workspaceId) return null;
    const t = titulo.trim();
    if (!t) return null;
    const proximaPosicao = (subtarefas[subtarefas.length - 1]?.posicao ?? -1) + 1;
    const { data, error } = await supabase
      .from("cartoes")
      .insert({
        titulo: t,
        workspace_id: workspaceId,
        cartao_pai_id: cartaoPaiId,
        coluna_id: null,
        posicao: proximaPosicao,
      })
      .select(
        "id, titulo, data_conclusao, coluna_id, peso, workspace_id, cartao_pai_id, posicao, criado_em"
      )
      .single();
    if (error) throw error;
    if (data) globalMutate(key, [...subtarefas, data as Subtarefa], false);
    return data as Subtarefa;
  }

  /** Vincula um card existente como subtarefa deste pai. */
  async function vincular(cartaoId: string) {
    if (!cartaoPaiId) return;
    await supabase.from("cartoes").update({ cartao_pai_id: cartaoPaiId }).eq("id", cartaoId);
    globalMutate(key);
  }

  /** Desvincula uma subtarefa (volta a ser card independente). */
  async function desvincular(cartaoId: string) {
    await supabase.from("cartoes").update({ cartao_pai_id: null }).eq("id", cartaoId);
    if (key) globalMutate(key, subtarefas.filter((s) => s.id !== cartaoId), false);
  }

  const concluidas = subtarefas.filter((s) => s.data_conclusao).length;
  const total = subtarefas.length;

  return { subtarefas, total, concluidas, carregando, criarRapida, vincular, desvincular };
}
