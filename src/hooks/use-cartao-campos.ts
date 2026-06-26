"use client";

import { supabase } from "@/lib/supabase/client";
import { CartaoCampoValor } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(cartaoId: string) {
  return `cartao-campos-${cartaoId}`;
}

/** Lê e escreve valores de campos customizados pra um card. */
export function useCartaoCampos(cartaoId: string | null) {
  const key = cartaoId ? chave(cartaoId) : null;

  const { data: valores = [], isLoading: carregando } = useSWR(key, async () => {
    if (!cartaoId) return [] as CartaoCampoValor[];
    const { data } = await supabase
      .from("cartao_campos_valores")
      .select("*")
      .eq("cartao_id", cartaoId);
    return (data || []) as CartaoCampoValor[];
  });

  /** Indexa valor por campo_id pra acesso rápido. */
  function getValor(campoId: string): CartaoCampoValor["valor"] {
    const v = valores.find((v) => v.campo_id === campoId);
    return v?.valor ?? null;
  }

  /** Faz upsert do valor de um campo no card.
   *  Otimista: atualiza local antes do round-trip. */
  async function setValor(campoId: string, valor: CartaoCampoValor["valor"]) {
    if (!cartaoId) return;

    const existente = valores.find((v) => v.campo_id === campoId);
    const nova: CartaoCampoValor = existente
      ? { ...existente, valor }
      : {
          id: `temp-${Date.now()}`,
          cartao_id: cartaoId,
          campo_id: campoId,
          valor,
          atualizado_em: new Date().toISOString(),
        };

    globalMutate(
      key,
      existente
        ? valores.map((v) => (v.campo_id === campoId ? nova : v))
        : [...valores, nova],
      false
    );

    // Upsert (insert ou update via conflict). Usa onConflict pra match
    // na constraint UNIQUE (cartao_id, campo_id).
    const { data } = await supabase
      .from("cartao_campos_valores")
      .upsert(
        {
          cartao_id: cartaoId,
          campo_id: campoId,
          valor,
        },
        { onConflict: "cartao_id,campo_id" }
      )
      .select()
      .single();

    if (data) {
      globalMutate(
        key,
        (current: CartaoCampoValor[] | undefined) =>
          (current || []).map((v) =>
            v.campo_id === campoId ? (data as CartaoCampoValor) : v
          ),
        false
      );
    }
    return data as CartaoCampoValor | null;
  }

  /** Apaga o valor (volta a "não preenchido"). */
  async function limpar(campoId: string) {
    if (!cartaoId) return;
    globalMutate(
      key,
      valores.filter((v) => v.campo_id !== campoId),
      false
    );
    await supabase
      .from("cartao_campos_valores")
      .delete()
      .eq("cartao_id", cartaoId)
      .eq("campo_id", campoId);
  }

  return { valores, carregando, getValor, setValor, limpar };
}
