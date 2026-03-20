"use client";

import { supabase } from "@/lib/supabase/client";
import { ComentarioComAutor } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(cartaoId: string | null) {
  return cartaoId ? `comentarios-${cartaoId}` : null;
}

export function useComentarios(cartaoId: string | null) {
  const key = chave(cartaoId);

  const { data: comentarios = [], isLoading: carregando } = useSWR(key, async () => {
    if (!cartaoId) return [];
    const { data } = await supabase
      .from("comentarios")
      .select("*, membros(id, nome, cor_avatar)")
      .eq("cartao_id", cartaoId)
      .order("criado_em", { ascending: false });
    return (data || []) as ComentarioComAutor[];
  });

  async function criar(texto: string, membroId?: string) {
    if (!cartaoId) return;
    const { data } = await supabase
      .from("comentarios")
      .insert({ cartao_id: cartaoId, membro_id: membroId || null, texto })
      .select("*, membros(id, nome, cor_avatar)")
      .single();
    if (data && key) {
      globalMutate(key, [data as ComentarioComAutor, ...comentarios], false);
    }
    return data;
  }

  async function atualizar(id: string, texto: string) {
    if (key) {
      globalMutate(key, comentarios.map((c) => c.id === id ? { ...c, texto, atualizado_em: new Date().toISOString() } : c), false);
    }
    await supabase.from("comentarios").update({ texto, atualizado_em: new Date().toISOString() }).eq("id", id);
  }

  async function excluir(id: string) {
    if (key) globalMutate(key, comentarios.filter((c) => c.id !== id), false);
    await supabase.from("comentarios").delete().eq("id", id);
  }

  function buscar() { if (key) globalMutate(key); }

  return { comentarios, carregando, criar, atualizar, excluir, buscar };
}
