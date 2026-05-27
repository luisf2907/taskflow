"use client";

import { supabase } from "@/lib/supabase/client";

export type TipoResultadoBusca = "cartao" | "wiki" | "comentario";

export interface ResultadoBusca {
  tipo: TipoResultadoBusca;
  id: string;
  workspace_id: string;
  titulo: string;
  snippet: string | null;
  quadro_id: string | null;
  slug: string | null;
  cartao_id: string | null;
  rank: number;
}

/** Chama a RPC buscar_global. SECURITY INVOKER + RLS garantem que só vê
 *  workspaces do usuário. Retorna até `limit` resultados ranqueados.
 *  Retorna array vazio em caso de erro (caller decide como sinalizar). */
export async function buscarGlobal(termo: string, limit = 30): Promise<ResultadoBusca[]> {
  const t = termo.trim();
  if (!t) return [];

  const { data, error } = await supabase.rpc("buscar_global", {
    termo: t,
    limit_total: limit,
  });

  if (error) {
    // Fallback silencioso — caller exibe estado "sem resultados".
    if (process.env.NODE_ENV !== "production") {
      console.warn("buscar_global RPC erro:", error.message);
    }
    return [];
  }

  return (data || []) as ResultadoBusca[];
}

/** Converte um ResultadoBusca em href de navegação. */
export function buscaHref(r: ResultadoBusca): string {
  if (r.tipo === "cartao" && r.quadro_id) {
    return `/quadro/${r.quadro_id}?card=${r.id}`;
  }
  if (r.tipo === "wiki" && r.slug) {
    return `/workspace/${r.workspace_id}/wiki/${r.slug}`;
  }
  if (r.tipo === "comentario" && r.quadro_id && r.cartao_id) {
    return `/quadro/${r.quadro_id}?card=${r.cartao_id}`;
  }
  return `/workspace/${r.workspace_id}`;
}
