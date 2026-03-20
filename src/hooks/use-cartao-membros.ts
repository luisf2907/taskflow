"use client";

import { supabase } from "@/lib/supabase/client";
import useSWR, { mutate as globalMutate } from "swr";

function chave(cartaoId: string | null) {
  return cartaoId ? `cartao-membros-${cartaoId}` : null;
}

export function useCartaoMembros(cartaoId: string | null) {
  const key = chave(cartaoId);

  const { data: membroIds = [], isLoading: carregando } = useSWR(key, async () => {
    if (!cartaoId) return [];
    const { data } = await supabase
      .from("cartao_membros")
      .select("membro_id")
      .eq("cartao_id", cartaoId);
    return (data || []).map((d) => d.membro_id);
  });

  async function adicionar(membroId: string) {
    if (!cartaoId || !key) return;
    globalMutate(key, [...membroIds, membroId], false);
    await supabase.from("cartao_membros").insert({ cartao_id: cartaoId, membro_id: membroId });
  }

  async function remover(membroId: string) {
    if (!cartaoId || !key) return;
    globalMutate(key, membroIds.filter((id) => id !== membroId), false);
    await supabase.from("cartao_membros").delete().eq("cartao_id", cartaoId).eq("membro_id", membroId);
  }

  async function toggle(membroId: string) {
    if (membroIds.includes(membroId)) await remover(membroId);
    else await adicionar(membroId);
  }

  function buscar() { if (key) globalMutate(key); }

  return { membroIds, carregando, adicionar, remover, toggle, buscar };
}
