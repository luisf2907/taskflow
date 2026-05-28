"use client";

import { supabase } from "@/lib/supabase/client";
import { CartaoDependencia } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(cartaoId: string) {
  return `cartao-deps-${cartaoId}`;
}

export interface CartaoDependenciaExpandida extends CartaoDependencia {
  cartao_titulo?: string;
  cartao_data_conclusao?: string | null;
  depende_de_titulo?: string;
  depende_de_data_conclusao?: string | null;
}

/** Lista deps de um card em ambas as direções:
 *  - bloqueando: cards que este card DEPENDE (este só conclui quando esses concluírem)
 *  - bloqueado_por: cards que dependem deste (esses só concluem quando este concluir)
 */
export function useDependencias(cartaoId: string | null) {
  const key = cartaoId ? chave(cartaoId) : null;

  const { data, isLoading: carregando } = useSWR(key, async () => {
    if (!cartaoId) return { bloqueando: [], bloqueadoPor: [] };

    const [bloqueando, bloqueadoPor] = await Promise.all([
      // Este card depende destes (suas dependências)
      supabase
        .from("cartao_dependencias")
        .select(
          `id, cartao_id, depende_de_cartao_id, criado_em, criado_por,
           depende_de:depende_de_cartao_id ( id, titulo, data_conclusao )`
        )
        .eq("cartao_id", cartaoId),
      // Estes cards dependem deste (cards que ele bloqueia)
      supabase
        .from("cartao_dependencias")
        .select(
          `id, cartao_id, depende_de_cartao_id, criado_em, criado_por,
           cartao:cartao_id ( id, titulo, data_conclusao )`
        )
        .eq("depende_de_cartao_id", cartaoId),
    ]);

    return {
      bloqueando: (bloqueando.data || []) as unknown as Array<
        CartaoDependencia & {
          depende_de: { id: string; titulo: string; data_conclusao: string | null } | null;
        }
      >,
      bloqueadoPor: (bloqueadoPor.data || []) as unknown as Array<
        CartaoDependencia & {
          cartao: { id: string; titulo: string; data_conclusao: string | null } | null;
        }
      >,
    };
  });

  const bloqueando = data?.bloqueando || [];
  const bloqueadoPor = data?.bloqueadoPor || [];

  /** Adiciona "este card depende de outroCartaoId" */
  async function adicionar(dependeDeId: string) {
    if (!cartaoId) return null;
    if (cartaoId === dependeDeId) return null;
    const { data, error } = await supabase
      .from("cartao_dependencias")
      .insert({
        cartao_id: cartaoId,
        depende_de_cartao_id: dependeDeId,
      })
      .select()
      .single();
    if (error) throw error;
    globalMutate(key);
    // Também invalida o cache do outro card (porque o bloqueadoPor dele muda)
    globalMutate(chave(dependeDeId));
    return data as CartaoDependencia;
  }

  async function remover(depId: string) {
    await supabase.from("cartao_dependencias").delete().eq("id", depId);
    globalMutate(key);
  }

  /** True se este card está bloqueado (tem >=1 dependência aberta) */
  const estaBloqueado = bloqueando.some((d) => {
    const dep = (d as unknown as { depende_de: { data_conclusao: string | null } | null }).depende_de;
    return dep && !dep.data_conclusao;
  });

  return { bloqueando, bloqueadoPor, estaBloqueado, carregando, adicionar, remover };
}
