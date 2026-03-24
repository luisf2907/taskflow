"use client";

import { supabase } from "@/lib/supabase/client";
import { Cartao } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";
import { useCallback } from "react";

export interface CartaoComResumo extends Cartao {
  etiqueta_ids: string[];
  membro_ids: string[];
  total_checklist_itens: number;
  total_checklist_concluidos: number;
  total_anexos: number;
}

function chave(quadroId: string) {
  return `cartoes-${quadroId}`;
}

async function fetchCartoes(quadroId: string): Promise<CartaoComResumo[]> {
  const { data } = await supabase
    .from("cartoes")
    .select("*, colunas!inner(quadro_id), cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)")
    .eq("colunas.quadro_id", quadroId)
    .order("posicao");

  if (!data) return [];

  const cartaoIds = data.map((c) => c.id);

  const [checklistsRes, anexosRes] = await Promise.all([
    cartaoIds.length > 0
      ? supabase.from("checklists").select("cartao_id, checklist_itens(concluido)").in("cartao_id", cartaoIds)
      : { data: [] },
    cartaoIds.length > 0
      ? supabase.from("anexos").select("cartao_id").in("cartao_id", cartaoIds)
      : { data: [] },
  ]);

  const checklistResumo: Record<string, { total: number; concluidos: number }> = {};
  if (checklistsRes.data) {
    for (const cl of checklistsRes.data) {
      const itens = (cl.checklist_itens || []) as { concluido: boolean }[];
      if (!checklistResumo[cl.cartao_id]) checklistResumo[cl.cartao_id] = { total: 0, concluidos: 0 };
      checklistResumo[cl.cartao_id].total += itens.length;
      checklistResumo[cl.cartao_id].concluidos += itens.filter((i) => i.concluido).length;
    }
  }

  const anexoContagem: Record<string, number> = {};
  if (anexosRes.data) {
    for (const a of anexosRes.data) {
      anexoContagem[a.cartao_id] = (anexoContagem[a.cartao_id] || 0) + 1;
    }
  }

  return data.map(({ colunas: _, cartao_etiquetas, cartao_membros, ...cartao }) => ({
    ...(cartao as Cartao),
    etiqueta_ids: (cartao_etiquetas || []).map((ce: { etiqueta_id: string }) => ce.etiqueta_id),
    membro_ids: [...new Set((cartao_membros || []).map((cm: { membro_id: string }) => cm.membro_id))] as string[],
    total_checklist_itens: checklistResumo[cartao.id]?.total || 0,
    total_checklist_concluidos: checklistResumo[cartao.id]?.concluidos || 0,
    total_anexos: anexoContagem[cartao.id] || 0,
  }));
}

export function useCartoes(quadroId: string) {
  const key = chave(quadroId);

  const { data: cartoes = [], isLoading: carregando } = useSWR(key, () => fetchCartoes(quadroId));

  function cartoesDaColuna(colunaId: string) {
    return cartoes
      .filter((c) => c.coluna_id === colunaId)
      .sort((a, b) => a.posicao - b.posicao);
  }

  const criar = useCallback(async function criarCartao(colunaId: string, titulo: string, peso?: number | null) {
    const posicao = cartoes.filter((c) => c.coluna_id === colunaId).length;
    const insert: Record<string, unknown> = { coluna_id: colunaId, titulo, posicao };
    if (peso != null) insert.peso = peso;
    const { data } = await supabase
      .from("cartoes")
      .insert(insert)
      .select()
      .single();
    if (data) {
      const enriquecido: CartaoComResumo = {
        ...data,
        etiquetas: data.etiquetas || [],
        etiqueta_ids: [],
        membro_ids: [],
        total_checklist_itens: 0,
        total_checklist_concluidos: 0,
        total_anexos: 0,
      };
      globalMutate(key, [...cartoes, enriquecido], false);
    }
    return data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cartoes]);

  async function atualizar(id: string, campos: Partial<Cartao>) {
    // Optimistic
    globalMutate(
      key,
      cartoes.map((c) => (c.id === id ? { ...c, ...campos, atualizado_em: new Date().toISOString() } : c)),
      false
    );

    const { data } = await supabase
      .from("cartoes")
      .update({ ...campos, atualizado_em: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (data) {
      globalMutate(key, cartoes.map((c) => (c.id === id ? { ...c, ...data } : c)), false);
    }
    return data;
  }

  async function excluir(id: string) {
    globalMutate(key, cartoes.filter((c) => c.id !== id), false);
    await supabase.from("cartoes").delete().eq("id", id);
  }

  async function mover(cartaoId: string, novaColunaId: string, novaPosicao: number) {
    globalMutate(
      key,
      cartoes.map((c) => c.id === cartaoId ? { ...c, coluna_id: novaColunaId, posicao: novaPosicao } : c),
      false
    );
    await supabase.from("cartoes").update({ coluna_id: novaColunaId, posicao: novaPosicao }).eq("id", cartaoId);
  }

  async function reordenarNaColuna(colunaId: string, cartoesOrdenados: CartaoComResumo[]) {
    const atualizados = cartoesOrdenados.map((c, i) => ({ ...c, posicao: i }));
    const outros = cartoes.filter((c) => c.coluna_id !== colunaId);
    globalMutate(key, [...outros, ...atualizados], false);

    const updates = atualizados.map((c) => ({
      id: c.id, coluna_id: c.coluna_id, titulo: c.titulo, descricao: c.descricao,
      posicao: c.posicao, etiquetas: c.etiquetas, data_entrega: c.data_entrega,
      peso: c.peso, criado_em: c.criado_em, atualizado_em: c.atualizado_em,
    }));
    await supabase.from("cartoes").upsert(updates);
  }

  function buscar() {
    globalMutate(key);
  }

  return { cartoes, carregando, cartoesDaColuna, criar, atualizar, excluir, mover, reordenarNaColuna, buscar };
}
