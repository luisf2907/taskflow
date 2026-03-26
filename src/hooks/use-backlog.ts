"use client";

import { supabase } from "@/lib/supabase/client";
import { Cartao } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

export interface CartaoBacklog extends Cartao {
  coluna_nome: string | null;
  quadro_nome: string | null;
  quadro_id: string | null;
  concluido: boolean;
  etiqueta_ids: string[];
  membro_ids: string[];
}

function chave(workspaceId: string) {
  return `backlog-${workspaceId}`;
}

async function fetchBacklog(workspaceId: string): Promise<CartaoBacklog[]> {
  // 2 queries em paralelo em vez de 4 sequenciais
  const [backlogRes, quadrosRes] = await Promise.all([
    supabase
      .from("cartoes")
      .select("*, cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)")
      .is("coluna_id", null)
      .eq("workspace_id", workspaceId)
      .order("criado_em", { ascending: false })
      .limit(300),
    supabase
      .from("quadros")
      .select("id, nome")
      .eq("workspace_id", workspaceId),
  ]);

  const backlogPuro = backlogRes.data || [];
  const quadrosDoWs = quadrosRes.data || [];
  const quadroIds = quadrosDoWs.map((q) => q.id);
  const quadroNomes: Record<string, string> = {};
  quadrosDoWs.forEach((q) => { quadroNomes[q.id] = q.nome; });

  // Se tem quadros, buscar colunas e cartões em paralelo
  let cartoesEmSprints: CartaoBacklog[] = [];
  if (quadroIds.length > 0) {
    const [colunasRes, sprintsRes] = await Promise.all([
      supabase
        .from("colunas")
        .select("id, quadro_id, posicao")
        .in("quadro_id", quadroIds)
        .order("posicao", { ascending: false }),
      supabase
        .from("cartoes")
        .select("*, colunas(id, nome, quadro_id), cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)")
        .not("coluna_id", "is", null)
        .in("colunas.quadro_id", quadroIds)
        .order("posicao")
        .limit(500),
    ]);

    const ultimaColunaPorQuadro: Record<string, string> = {};
    if (colunasRes.data) {
      for (const col of colunasRes.data) {
        if (!ultimaColunaPorQuadro[col.quadro_id]) {
          ultimaColunaPorQuadro[col.quadro_id] = col.id;
        }
      }
    }

    if (sprintsRes.data) {
      cartoesEmSprints = sprintsRes.data
        .filter((c) => c.colunas)
        .map(({ colunas, cartao_etiquetas, cartao_membros, ...cartao }) => {
          const col = colunas as unknown as { id: string; nome: string; quadro_id: string };
          return {
            ...(cartao as Cartao),
            coluna_nome: col.nome,
            quadro_nome: quadroNomes[col.quadro_id] || null,
            quadro_id: col.quadro_id,
            concluido: col.id === ultimaColunaPorQuadro[col.quadro_id],
            etiqueta_ids: ((cartao_etiquetas || []) as { etiqueta_id: string }[]).map(ce => ce.etiqueta_id),
            membro_ids: ((cartao_membros || []) as { membro_id: string }[]).map(cm => cm.membro_id),
          };
        });
    }
  }

  const backlogFormatado: CartaoBacklog[] = backlogPuro.map(({ cartao_etiquetas, cartao_membros, ...c }) => ({
    ...(c as Cartao),
    coluna_nome: null,
    quadro_nome: null,
    quadro_id: null,
    concluido: false,
    etiqueta_ids: ((cartao_etiquetas || []) as { etiqueta_id: string }[]).map(ce => ce.etiqueta_id),
    membro_ids: ((cartao_membros || []) as { membro_id: string }[]).map(cm => cm.membro_id),
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

  // Associar tarefa a sprint (optimistic → persist)
  async function associarASprint(cartaoId: string, quadroId: string) {
    // Optimistic: remover do backlog imediatamente
    const quadroNome = cartoes.find((c) => c.quadro_id === quadroId)?.quadro_nome || null;
    globalMutate(key, cartoes.map((c) =>
      c.id === cartaoId ? { ...c, coluna_id: "__pending__", workspace_id: null, quadro_id: quadroId, quadro_nome: quadroNome, coluna_nome: "...", concluido: false } : c
    ), { revalidate: false });

    // Persist em background
    const { data: colunas } = await supabase.from("colunas").select("id, nome").eq("quadro_id", quadroId).order("posicao").limit(1);
    if (!colunas || colunas.length === 0) { globalMutate(key); return; }

    const { count } = await supabase.from("cartoes").select("id", { count: "exact", head: true }).eq("coluna_id", colunas[0].id);
    await supabase.from("cartoes").update({ coluna_id: colunas[0].id, workspace_id: null, posicao: count || 0 }).eq("id", cartaoId);

    globalMutate(key);
    globalMutate(`cartoes-${quadroId}`);
  }

  // Desassociar de sprint (optimistic → persist)
  async function desassociarDeSprint(cartaoId: string, quadroIdOriginal: string) {
    // Optimistic: mover pro backlog imediatamente
    globalMutate(key, cartoes.map((c) =>
      c.id === cartaoId ? { ...c, coluna_id: null, workspace_id: workspaceId, quadro_id: null, quadro_nome: null, coluna_nome: null, concluido: false } : c
    ), { revalidate: false });

    // Persist
    await supabase.from("cartoes").update({ coluna_id: null, workspace_id: workspaceId, posicao: 0 }).eq("id", cartaoId);

    globalMutate(key);
    globalMutate(`cartoes-${quadroIdOriginal}`);
  }

  // Mover entre sprints (optimistic → persist)
  async function moverParaSprint(cartaoId: string, quadroIdOriginal: string, quadroIdNovo: string) {
    // Optimistic: atualizar quadro_id imediatamente
    const quadroNome = cartoes.find((c) => c.quadro_id === quadroIdNovo)?.quadro_nome || null;
    globalMutate(key, cartoes.map((c) =>
      c.id === cartaoId ? { ...c, quadro_id: quadroIdNovo, quadro_nome: quadroNome, coluna_nome: "...", concluido: false } : c
    ), { revalidate: false });

    // Persist
    const { data: colunas } = await supabase.from("colunas").select("id").eq("quadro_id", quadroIdNovo).order("posicao").limit(1);
    if (!colunas || colunas.length === 0) { globalMutate(key); return; }

    const { count } = await supabase.from("cartoes").select("id", { count: "exact", head: true }).eq("coluna_id", colunas[0].id);
    await supabase.from("cartoes").update({ coluna_id: colunas[0].id, posicao: count || 0 }).eq("id", cartaoId);

    globalMutate(key);
    globalMutate(`cartoes-${quadroIdOriginal}`);
    globalMutate(`cartoes-${quadroIdNovo}`);
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
    moverParaSprint,
    excluirTarefa,
    buscar,
  };
}
