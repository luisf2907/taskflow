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
  /** Só preenchido na view workspace: épico resolvido (próprio ou herdado). */
  epico_id?: string | null;
  epico_titulo?: string | null;
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

export interface CardSemDep {
  id: string;
  titulo: string;
  data_conclusao: string | null;
  coluna_nome: string | null;
  quadro_id: string | null;
  quadro_nome: string | null;
  epico_id: string | null;
  epico_cor: string | null;
  epico_titulo: string | null;
}

/** Cards do workspace que NÃO participam de nenhuma dependência (bandeja). */
export function useCardsSemDep(workspaceId: string | null) {
  const key = workspaceId ? `cards-sem-dep-${workspaceId}` : null;

  const { data, isLoading: carregando } = useSWR(key, async () => {
    if (!workspaceId) return [] as CardSemDep[];
    const { data, error } = await supabase.rpc("cards_sem_dependencia_workspace", {
      ws_id: workspaceId,
    });
    if (error) throw error;
    return (data || []) as CardSemDep[];
  });

  return { cards: data || [], carregando };
}

interface RawLinhaWs {
  tipo_linha: "no" | "aresta";
  no_id: string | null;
  no_titulo: string | null;
  no_data_conclusao: string | null;
  no_coluna_nome: string | null;
  no_quadro_id: string | null;
  no_quadro_nome: string | null;
  no_epico_id: string | null;
  no_epico_cor: string | null;
  no_epico_titulo: string | null;
  aresta_origem: string | null;
  aresta_destino: string | null;
}

/** Grafo de TODAS as dependências do workspace (cards que participam de
 *  alguma dep). Usado pela view dedicada de dependências. */
export function useGrafoWorkspace(workspaceId: string | null) {
  const key = workspaceId ? `grafo-ws-${workspaceId}` : null;

  const { data, isLoading: carregando, error } = useSWR(key, async () => {
    if (!workspaceId) return { nos: [] as GrafoNo[], arestas: [] as GrafoAresta[] };

    const { data: linhas, error } = await supabase.rpc("grafo_dependencias_workspace", {
      ws_id: workspaceId,
    });
    if (error) throw error;

    const nos: GrafoNo[] = [];
    const arestas: GrafoAresta[] = [];

    for (const l of (linhas || []) as RawLinhaWs[]) {
      if (l.tipo_linha === "no" && l.no_id) {
        nos.push({
          id: l.no_id,
          titulo: l.no_titulo || "(sem título)",
          data_conclusao: l.no_data_conclusao,
          coluna_nome: l.no_coluna_nome,
          quadro_id: l.no_quadro_id,
          quadro_nome: l.no_quadro_nome,
          eh_epico: false, // irrelevante na view; usamos epico resolvido
          cor_epico: l.no_epico_cor, // cor do épico resolvido (pra bolinha)
          profundidade: 0,
          epico_id: l.no_epico_id,
          epico_titulo: l.no_epico_titulo,
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
