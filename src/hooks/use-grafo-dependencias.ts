"use client";

import { supabase } from "@/lib/supabase/client";
import useSWR from "swr";

export interface GrafoNo {
  id: string;
  titulo: string;
  data_conclusao: string | null;
  coluna_nome: string | null;
  quadro_id: string | null;
  quadro_nome: string | null;
  eh_epico: boolean;
  cor_epico: string | null;
  profundidade: number;
}

export interface GrafoAresta {
  /** quem depende (fica bloqueado) */
  origem: string;
  /** de quem depende (precisa concluir antes) */
  destino: string;
}

interface RawLinha {
  tipo_linha: "no" | "aresta";
  no_id: string | null;
  no_titulo: string | null;
  no_data_conclusao: string | null;
  no_coluna_nome: string | null;
  no_quadro_id: string | null;
  no_quadro_nome: string | null;
  no_eh_epico: boolean | null;
  no_cor_epico: string | null;
  no_profundidade: number | null;
  aresta_origem: string | null;
  aresta_destino: string | null;
}

function chave(cartaoId: string) {
  return `grafo-deps-${cartaoId}`;
}

/** Busca o grafo de dependências alcançável a partir de um card (BFS
 *  recursivo no Postgres via RPC grafo_dependencias). */
export function useGrafoDependencias(cartaoId: string | null) {
  const key = cartaoId ? chave(cartaoId) : null;

  const { data, isLoading: carregando, error } = useSWR(key, async () => {
    if (!cartaoId) return { nos: [] as GrafoNo[], arestas: [] as GrafoAresta[] };

    const { data: linhas, error } = await supabase.rpc("grafo_dependencias", {
      card_id: cartaoId,
      max_profundidade: 6,
    });
    if (error) throw error;

    const nos: GrafoNo[] = [];
    const arestas: GrafoAresta[] = [];

    for (const l of (linhas || []) as RawLinha[]) {
      if (l.tipo_linha === "no" && l.no_id) {
        nos.push({
          id: l.no_id,
          titulo: l.no_titulo || "(sem título)",
          data_conclusao: l.no_data_conclusao,
          coluna_nome: l.no_coluna_nome,
          quadro_id: l.no_quadro_id,
          quadro_nome: l.no_quadro_nome,
          eh_epico: !!l.no_eh_epico,
          cor_epico: l.no_cor_epico,
          profundidade: l.no_profundidade ?? 0,
        });
      } else if (l.tipo_linha === "aresta" && l.aresta_origem && l.aresta_destino) {
        arestas.push({ origem: l.aresta_origem, destino: l.aresta_destino });
      }
    }

    return { nos, arestas };
  });

  return {
    nos: data?.nos || [],
    arestas: data?.arestas || [],
    carregando,
    erro: error as Error | undefined,
  };
}
