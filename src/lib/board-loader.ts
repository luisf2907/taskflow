"use client";

import { supabase } from "@/lib/supabase/client";
import type { CartaoComResumo } from "@/hooks/use-cartoes";
import type { Cartao, Coluna, Quadro } from "@/types";

// ═══════════════════════════════════════════════════════════════════════
// Carregamento do board — 1 round-trip
// ═══════════════════════════════════════════════════════════════════════
// Os hooks do board (useQuadro, useColunas, useCartoes) tem chaves SWR
// separadas — o que e bom pras mutacoes otimistas, mas fazia cada um
// disparar sua propria cascata de queries. Aqui eles passam a compartilhar
// UMA chamada: `get_board_data` devolve quadro + colunas + cartoes ja
// enriquecidos (ver migration 055).
//
// A deduplicacao e por promise em voo: os hooks montam no mesmo tick, entao
// os tres pegam a mesma requisicao. Nao guardamos o resultado depois de
// resolver — cache e responsabilidade do SWR, e revalidacao explicita
// (`buscar()`, realtime) precisa mesmo ir ao servidor.
// ═══════════════════════════════════════════════════════════════════════

export interface DadosBoard {
  quadro: Quadro | null;
  colunas: Coluna[];
  cartoes: CartaoComResumo[];
}

interface RespostaRpc {
  quadro: Quadro | null;
  colunas: Coluna[] | null;
  cartoes: CartaoComResumo[] | null;
}

// Codigos que significam "a funcao nao existe neste banco":
//   PGRST202 — ausente do schema cache do PostgREST
//   42883    — undefined_function do proprio Postgres
const CODIGOS_RPC_AUSENTE = new Set(["PGRST202", "42883"]);

// Instalacao sem a migration 055 e propriedade do DEPLOY, nao da request.
// Uma vez detectada, nao adianta tentar o RPC de novo nesta sessao.
let rpcAusente = false;

/**
 * Caminho rapido.
 *
 * So degrada pro `viaQueries` quando a funcao realmente NAO EXISTE. Qualquer
 * outro erro (timeout de statement, banco congestionado, PostgREST recarregando
 * schema) e propagado.
 *
 * Isso importa sob carga: `viaQueries` dispara ~10 queries no lugar de 1.
 * Cair nele por timeout significa que, exatamente quando o banco esta afogado,
 * cada cliente decuplica o proprio pedido — uma estampida que agrava a causa
 * do erro. Propagando, o SWR aplica `errorRetryCount` com backoff.
 */
async function viaRpc(quadroId: string): Promise<DadosBoard> {
  const { data, error } = await supabase.rpc("get_board_data", {
    p_quadro_id: quadroId,
  });

  if (error) {
    if (CODIGOS_RPC_AUSENTE.has(error.code ?? "")) {
      rpcAusente = true;
      console.warn(
        "[board] get_board_data ausente (migration 055?), usando queries separadas:",
        error.message,
      );
      return viaQueries(quadroId);
    }
    throw error;
  }

  // jsonb_build_object nunca devolve null; se acontecer, o banco respondeu
  // algo inesperado e o caminho antigo confirma.
  if (!data) return viaQueries(quadroId);

  const d = data as RespostaRpc;
  return {
    quadro: d.quadro ?? null,
    colunas: d.colunas ?? [],
    cartoes: d.cartoes ?? [],
  };
}

/**
 * Fallback: o caminho anterior a migration 055 — 4 round-trips
 * (quadro/colunas em paralelo, depois cartoes -> checklists+anexos -> pais).
 */
async function viaQueries(quadroId: string): Promise<DadosBoard> {
  const [quadroRes, colunasRes, cartoes] = await Promise.all([
    supabase.from("quadros").select("*").eq("id", quadroId).single(),
    supabase.from("colunas").select("*").eq("quadro_id", quadroId).order("posicao"),
    fetchCartoesLegado(quadroId),
  ]);

  return {
    quadro: (quadroRes.data as Quadro | null) ?? null,
    colunas: (colunasRes.data || []) as Coluna[],
    cartoes,
  };
}

async function fetchCartoesLegado(quadroId: string): Promise<CartaoComResumo[]> {
  const { data } = await supabase
    .from("cartoes")
    .select(
      "*, colunas!inner(quadro_id), cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)",
    )
    .eq("colunas.quadro_id", quadroId)
    .order("posicao")
    .limit(500);

  if (!data) return [];

  const cartaoIds = data.map((c) => c.id);

  // Batch IN queries in chunks of 100 to avoid Supabase URL length limits
  async function batchIn<T>(table: string, select: string, ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
    const results = await Promise.all(
      chunks.map((chunk) => supabase.from(table).select(select).in("cartao_id", chunk)),
    );
    return results.flatMap((r) => (r.data || []) as T[]);
  }

  const [checklistsData, anexosData] = await Promise.all([
    batchIn<{ cartao_id: string; checklist_itens: { concluido: boolean }[] }>(
      "checklists",
      "cartao_id, checklist_itens(concluido)",
      cartaoIds,
    ),
    batchIn<{ cartao_id: string }>("anexos", "cartao_id", cartaoIds),
  ]);

  // Resolve cor herdada do épico pai. Pega todos os pais únicos referenciados.
  const paiIds = [
    ...new Set(
      data
        .filter((c) => c.cartao_pai_id && c.cartao_pai_id !== c.id)
        .map((c) => c.cartao_pai_id as string),
    ),
  ];
  const paiEpicoMap: Record<string, { cor: string | null; titulo: string }> = {};
  if (paiIds.length > 0) {
    const { data: pais } = await supabase
      .from("cartoes")
      .select("id, eh_epico, cor_epico, titulo")
      .in("id", paiIds);
    for (const p of pais || []) {
      if (p.eh_epico) {
        paiEpicoMap[p.id] = { cor: p.cor_epico, titulo: p.titulo };
      }
    }
  }

  const checklistResumo: Record<string, { total: number; concluidos: number }> = {};
  for (const cl of checklistsData) {
    const itens = (cl.checklist_itens || []) as { concluido: boolean }[];
    if (!checklistResumo[cl.cartao_id])
      checklistResumo[cl.cartao_id] = { total: 0, concluidos: 0 };
    checklistResumo[cl.cartao_id].total += itens.length;
    checklistResumo[cl.cartao_id].concluidos += itens.filter((i) => i.concluido).length;
  }

  const anexoContagem: Record<string, number> = {};
  for (const a of anexosData) {
    anexoContagem[a.cartao_id] = (anexoContagem[a.cartao_id] || 0) + 1;
  }

  return data.map(({ colunas: _, cartao_etiquetas, cartao_membros, ...cartao }) => {
    const c = cartao as Cartao;
    // Cor do épico: próprio se eh_epico, senão herdado do pai (se pai for épico).
    let epico_cor: string | null = null;
    let epico_titulo: string | null = null;
    if (c.eh_epico && c.cor_epico) {
      epico_cor = c.cor_epico;
      epico_titulo = c.titulo;
    } else if (c.cartao_pai_id && paiEpicoMap[c.cartao_pai_id]) {
      epico_cor = paiEpicoMap[c.cartao_pai_id].cor;
      epico_titulo = paiEpicoMap[c.cartao_pai_id].titulo;
    }
    return {
      ...c,
      etiqueta_ids: (cartao_etiquetas || []).map(
        (ce: { etiqueta_id: string }) => ce.etiqueta_id,
      ),
      membro_ids: [
        ...new Set((cartao_membros || []).map((cm: { membro_id: string }) => cm.membro_id)),
      ] as string[],
      total_checklist_itens: checklistResumo[cartao.id]?.total || 0,
      total_checklist_concluidos: checklistResumo[cartao.id]?.concluidos || 0,
      total_anexos: anexoContagem[cartao.id] || 0,
      epico_cor,
      epico_titulo,
    };
  });
}

const emVoo = new Map<string, Promise<DadosBoard>>();

/** Carrega o board, compartilhando a requisicao entre os hooks que a pedirem no mesmo tick. */
export function carregarBoard(quadroId: string): Promise<DadosBoard> {
  const existente = emVoo.get(quadroId);
  if (existente) return existente;

  const promessa = rpcAusente ? viaQueries(quadroId) : viaRpc(quadroId);

  emVoo.set(quadroId, promessa);
  void promessa
    .catch(() => {
      // erro e propagado pra quem chamou; aqui so evitamos unhandled rejection
    })
    .finally(() => {
      if (emVoo.get(quadroId) === promessa) emVoo.delete(quadroId);
    });

  return promessa;
}
