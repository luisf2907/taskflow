"use client";

import { supabase } from "@/lib/supabase/client";
import { Automacao, TriggerTipo, AcaoTipo } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(workspaceId: string) {
  return `automacoes-ws-${workspaceId}`;
}

export function useAutomacoes(workspaceId: string) {
  const key = chave(workspaceId);

  const { data: automacoes = [], isLoading: carregando } = useSWR(key, async () => {
    const { data } = await supabase
      .from("automacoes")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("criado_em");
    return (data || []) as Automacao[];
  });

  async function criar(params: {
    nome: string;
    trigger_tipo: TriggerTipo;
    trigger_config: Record<string, string>;
    acao_tipo: AcaoTipo;
    acao_config: Record<string, string>;
  }) {
    const { data } = await supabase
      .from("automacoes")
      .insert({ workspace_id: workspaceId, ...params })
      .select()
      .single();
    if (data) globalMutate(key, [...automacoes, data], false);
    return data;
  }

  async function excluir(id: string) {
    globalMutate(key, automacoes.filter((a) => a.id !== id), false);
    await supabase.from("automacoes").delete().eq("id", id);
  }

  async function toggleAtivo(id: string) {
    const auto = automacoes.find((a) => a.id === id);
    if (!auto) return;
    const novoValor = !auto.ativo;
    globalMutate(key, automacoes.map((a) => (a.id === id ? { ...a, ativo: novoValor } : a)), false);
    await supabase.from("automacoes").update({ ativo: novoValor }).eq("id", id);
  }

  function buscar() {
    globalMutate(key);
  }

  return { automacoes, carregando, criar, excluir, toggleAtivo, buscar };
}
