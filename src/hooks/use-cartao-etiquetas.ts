"use client";

import { supabase } from "@/lib/supabase/client";
import useSWR, { mutate as globalMutate } from "swr";

function chave(cartaoId: string | null) {
  return cartaoId ? `cartao-etiquetas-${cartaoId}` : null;
}

export function useCartaoEtiquetas(cartaoId: string | null) {
  const key = chave(cartaoId);

  const { data: etiquetaIds = [], isLoading: carregando } = useSWR(key, async () => {
    if (!cartaoId) return [];
    const { data } = await supabase
      .from("cartao_etiquetas")
      .select("etiqueta_id")
      .eq("cartao_id", cartaoId);
    return (data || []).map((d) => d.etiqueta_id);
  });

  async function adicionar(etiquetaId: string) {
    if (!cartaoId || !key) return;
    globalMutate(key, [...etiquetaIds, etiquetaId], false);
    await supabase.from("cartao_etiquetas").insert({ cartao_id: cartaoId, etiqueta_id: etiquetaId });
  }

  async function remover(etiquetaId: string) {
    if (!cartaoId || !key) return;
    globalMutate(key, etiquetaIds.filter((id) => id !== etiquetaId), false);
    await supabase.from("cartao_etiquetas").delete().eq("cartao_id", cartaoId).eq("etiqueta_id", etiquetaId);
  }

  async function toggle(etiquetaId: string) {
    if (etiquetaIds.includes(etiquetaId)) await remover(etiquetaId);
    else await adicionar(etiquetaId);
  }

  function buscar() { if (key) globalMutate(key); }

  return { etiquetaIds, carregando, adicionar, remover, toggle, buscar };
}
