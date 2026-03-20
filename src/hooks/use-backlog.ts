"use client";

import { supabase } from "@/lib/supabase/client";
import { Cartao } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

export interface CartaoBacklog extends Cartao {
  // Nome da coluna e do quadro (sprint) se associado
  coluna_nome: string | null;
  quadro_nome: string | null;
  quadro_id: string | null;
}

function chave(workspaceId: string) {
  return `backlog-${workspaceId}`;
}

async function fetchBacklog(workspaceId: string): Promise<CartaoBacklog[]> {
  // Buscar TODOS os cartões do workspace:
  // 1. Cartões de backlog (coluna_id IS NULL, workspace_id = workspaceId)
  // 2. Cartões dentro de sprints (quadros do workspace)

  // Cartões de backlog puro
  const { data: backlogPuro } = await supabase
    .from("cartoes")
    .select("*")
    .is("coluna_id", null)
    .eq("workspace_id", workspaceId)
    .order("criado_em", { ascending: false });

  // Cartões dentro de sprints desse workspace
  const { data: quadrosDoWs } = await supabase
    .from("quadros")
    .select("id, nome")
    .eq("workspace_id", workspaceId);

  const quadroIds = (quadrosDoWs || []).map((q) => q.id);
  const quadroNomes: Record<string, string> = {};
  (quadrosDoWs || []).forEach((q) => { quadroNomes[q.id] = q.nome; });

  let cartoesEmSprints: CartaoBacklog[] = [];
  if (quadroIds.length > 0) {
    const { data: cartoesSprints } = await supabase
      .from("cartoes")
      .select("*, colunas(id, nome, quadro_id)")
      .not("coluna_id", "is", null)
      .in("colunas.quadro_id", quadroIds)
      .order("posicao");

    if (cartoesSprints) {
      cartoesEmSprints = cartoesSprints
        .filter((c) => c.colunas)
        .map(({ colunas, ...cartao }) => {
          const col = colunas as unknown as { id: string; nome: string; quadro_id: string };
          return {
            ...(cartao as Cartao),
            coluna_nome: col.nome,
            quadro_nome: quadroNomes[col.quadro_id] || null,
            quadro_id: col.quadro_id,
          };
        });
    }
  }

  // Combinar
  const backlogFormatado: CartaoBacklog[] = (backlogPuro || []).map((c) => ({
    ...c,
    coluna_nome: null,
    quadro_nome: null,
    quadro_id: null,
  }));

  return [...backlogFormatado, ...cartoesEmSprints];
}

export function useBacklog(workspaceId: string) {
  const key = chave(workspaceId);

  const { data: cartoes = [], isLoading: carregando } = useSWR(key, () => fetchBacklog(workspaceId));

  // Cartões sem sprint (backlog puro)
  const backlogPuro = cartoes.filter((c) => !c.coluna_id && !c.quadro_id);

  // Cartões agrupados por sprint
  function cartoesDaSprint(quadroId: string) {
    return cartoes.filter((c) => c.quadro_id === quadroId);
  }

  // Criar tarefa no backlog (sem coluna, sem quadro)
  async function criarTarefa(titulo: string, peso?: number) {
    const { data } = await supabase
      .from("cartoes")
      .insert({
        titulo,
        workspace_id: workspaceId,
        coluna_id: null,
        posicao: 0,
        peso: peso || null,
      })
      .select()
      .single();

    if (data) {
      const novo: CartaoBacklog = {
        ...data,
        etiquetas: data.etiquetas || [],
        coluna_nome: null,
        quadro_nome: null,
        quadro_id: null,
      };
      globalMutate(key, [novo, ...cartoes], false);
    }
    return data;
  }

  // Associar tarefa a sprint (move pra primeira coluna do quadro)
  async function associarASprint(cartaoId: string, quadroId: string) {
    // Buscar primeira coluna do quadro
    const { data: colunas } = await supabase
      .from("colunas")
      .select("id, nome")
      .eq("quadro_id", quadroId)
      .order("posicao")
      .limit(1);

    if (!colunas || colunas.length === 0) return;
    const primeiraColuna = colunas[0];

    // Contar cartões na coluna pra posição
    const { count } = await supabase
      .from("cartoes")
      .select("id", { count: "exact", head: true })
      .eq("coluna_id", primeiraColuna.id);

    await supabase
      .from("cartoes")
      .update({
        coluna_id: primeiraColuna.id,
        workspace_id: null,
        posicao: count || 0,
      })
      .eq("id", cartaoId);

    // Atualizar cache
    globalMutate(key);
    // Também invalidar cache dos cartões do quadro
    globalMutate(`cartoes-${quadroId}`);
  }

  // Desassociar de sprint (volta pro backlog)
  async function desassociarDeSprint(cartaoId: string, quadroIdOriginal: string) {
    await supabase
      .from("cartoes")
      .update({
        coluna_id: null,
        workspace_id: workspaceId,
        posicao: 0,
      })
      .eq("id", cartaoId);

    globalMutate(key);
    globalMutate(`cartoes-${quadroIdOriginal}`);
  }

  // Excluir tarefa
  async function excluirTarefa(cartaoId: string) {
    globalMutate(key, cartoes.filter((c) => c.id !== cartaoId), false);
    await supabase.from("cartoes").delete().eq("id", cartaoId);
  }

  function buscar() {
    globalMutate(key);
  }

  return {
    cartoes,
    backlogPuro,
    cartoesDaSprint,
    carregando,
    criarTarefa,
    associarASprint,
    desassociarDeSprint,
    excluirTarefa,
    buscar,
  };
}
