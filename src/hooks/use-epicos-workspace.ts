"use client";

import { supabase } from "@/lib/supabase/client";
import useSWR from "swr";

export interface EpicoFilho {
  id: string;
  titulo: string;
  data_conclusao: string | null;
  peso: number | null;
  coluna_id: string | null;
  membro_ids: string[];
  // Contexto de sprint/coluna
  coluna_nome: string | null;
  quadro_id: string | null;
  quadro_nome: string | null;
  quadro_status: "planejada" | "ativa" | "concluida" | null;
}

export interface EpicoComFilhos {
  id: string;
  titulo: string;
  cor_epico: string | null;
  data_conclusao: string | null;
  peso: number | null;
  workspace_id: string;
  quadro_id: string | null;
  quadro_nome: string | null;
  filhos: EpicoFilho[];
  total_pts: number;
  pts_concluidos: number;
  total_filhos: number;
  filhos_concluidos: number;
  // Sprints únicos onde os filhos vivem (pra exibir "cruza N sprints")
  sprints_distintos: number;
}

function chave(workspaceId: string) {
  return `epicos-workspace-${workspaceId}`;
}

interface RawCard {
  id: string;
  titulo: string;
  data_conclusao: string | null;
  peso: number | null;
  coluna_id: string | null;
  cartao_pai_id: string | null;
  eh_epico: boolean;
  cor_epico: string | null;
  workspace_id: string;
  cartao_membros: { membro_id: string }[] | null;
  colunas: {
    id: string;
    nome: string;
    quadro_id: string;
    quadros: { id: string; nome: string; status_sprint: string } | null;
  } | null;
}

/** Busca workspace-wide: todos os épicos + filhos + cards órfãos.
 *  Cruzando sprints (cada card mostra a qual sprint pertence). */
export function useEpicosWorkspace(workspaceId: string | null) {
  const key = workspaceId ? chave(workspaceId) : null;

  const { data, isLoading: carregando } = useSWR(key, async () => {
    if (!workspaceId) {
      return { epicos: [] as EpicoComFilhos[], orfaos: [] as EpicoFilho[] };
    }

    // Pega TODOS os cards do workspace + contexto de coluna/sprint
    const { data: cards } = await supabase
      .from("cartoes")
      .select(
        `id, titulo, data_conclusao, peso, coluna_id, cartao_pai_id, eh_epico,
         cor_epico, workspace_id,
         cartao_membros(membro_id),
         colunas:coluna_id ( id, nome, quadro_id, quadros:quadro_id(id, nome, status_sprint) )`
      )
      .eq("workspace_id", workspaceId)
      .order("criado_em", { ascending: false });

    const raw = (cards || []) as unknown as RawCard[];

    function toFilho(c: RawCard): EpicoFilho {
      return {
        id: c.id,
        titulo: c.titulo,
        data_conclusao: c.data_conclusao,
        peso: c.peso,
        coluna_id: c.coluna_id,
        membro_ids: (c.cartao_membros || []).map((m) => m.membro_id),
        coluna_nome: c.colunas?.nome ?? null,
        quadro_id: c.colunas?.quadro_id ?? null,
        quadro_nome: c.colunas?.quadros?.nome ?? null,
        quadro_status:
          (c.colunas?.quadros?.status_sprint as EpicoFilho["quadro_status"]) ?? null,
      };
    }

    // Separa épicos vs cards comuns
    const epicosRaw = raw.filter((c) => c.eh_epico);
    const naoEpicos = raw.filter((c) => !c.eh_epico);

    // Index de filhos por pai
    const filhosPorPai: Record<string, EpicoFilho[]> = {};
    for (const c of naoEpicos) {
      if (c.cartao_pai_id) {
        if (!filhosPorPai[c.cartao_pai_id]) filhosPorPai[c.cartao_pai_id] = [];
        filhosPorPai[c.cartao_pai_id].push(toFilho(c));
      }
    }

    const epicos: EpicoComFilhos[] = epicosRaw.map((e) => {
      const filhos = filhosPorPai[e.id] || [];
      const total_pts = filhos.reduce((s, f) => s + (f.peso || 0), 0);
      const pts_concluidos = filhos
        .filter((f) => f.data_conclusao)
        .reduce((s, f) => s + (f.peso || 0), 0);
      const filhos_concluidos = filhos.filter((f) => f.data_conclusao).length;
      const sprints_distintos = new Set(
        filhos.map((f) => f.quadro_id).filter((q): q is string => !!q)
      ).size;

      return {
        id: e.id,
        titulo: e.titulo,
        cor_epico: e.cor_epico,
        data_conclusao: e.data_conclusao,
        peso: e.peso,
        workspace_id: e.workspace_id,
        quadro_id: e.colunas?.quadro_id ?? null,
        quadro_nome: e.colunas?.quadros?.nome ?? null,
        filhos,
        total_pts,
        pts_concluidos,
        total_filhos: filhos.length,
        filhos_concluidos,
        sprints_distintos,
      };
    });

    // Ordena épicos: ativos antes de concluídos, dentro do grupo por progresso desc
    epicos.sort((a, b) => {
      const ac = !!a.data_conclusao;
      const bc = !!b.data_conclusao;
      if (ac !== bc) return ac ? 1 : -1;
      return b.total_filhos - a.total_filhos;
    });

    // Órfãos: cards sem cartao_pai_id E não-épicos (cards "soltos")
    const orfaos: EpicoFilho[] = naoEpicos
      .filter((c) => !c.cartao_pai_id)
      .map(toFilho);

    return { epicos, orfaos };
  });

  return {
    epicos: data?.epicos || [],
    orfaos: data?.orfaos || [],
    carregando,
  };
}
