"use client";

import { supabase } from "@/lib/supabase/client";
import { usuarioAtual } from "@/lib/supabase/usuario";
import { carregarBoard } from "@/lib/board-loader";
import { registrarAtividade } from "@/lib/atividades";
import { executarAutomacoes } from "@/lib/automacoes-executor";
import { criarNotificacao } from "@/lib/notificacoes";
import { trackClientEvent } from "@/lib/umami";
import { Cartao } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";
import { useCallback } from "react";

export interface CartaoComResumo extends Cartao {
  etiqueta_ids: string[];
  membro_ids: string[];
  total_checklist_itens: number;
  total_checklist_concluidos: number;
  total_anexos: number;
  /** Cor do épico ao qual este card pertence (próprio se eh_epico, senão herdada do pai). */
  epico_cor: string | null;
  /** Nome (título) do épico, pra tooltip. */
  epico_titulo: string | null;
}

function chave(quadroId: string) {
  return `cartoes-${quadroId}`;
}

export function useCartoes(quadroId: string) {
  const key = chave(quadroId);

  // Le do carregamento compartilhado do board — mesma requisicao que
  // useQuadro e useColunas usam (ver src/lib/board-loader.ts).
  const { data: cartoes = [], isLoading: carregando } = useSWR(
    key,
    async () => (await carregarBoard(quadroId)).cartoes,
  );

  function cartoesDaColuna(colunaId: string) {
    return cartoes
      .filter((c) => c.coluna_id === colunaId)
      .sort((a, b) => a.posicao - b.posicao);
  }

  const criar = useCallback(async function criarCartao(colunaId: string, titulo: string, peso?: number | null) {
    // Buscar workspace_id do quadro para garantir que o card sempre tenha workspace_id
    const { data: quadro } = await supabase
      .from("quadros")
      .select("workspace_id")
      .eq("id", quadroId)
      .single();

    const posicao = cartoes.filter((c) => c.coluna_id === colunaId).length;
    const insert: Record<string, unknown> = {
      coluna_id: colunaId,
      titulo,
      posicao,
      workspace_id: quadro?.workspace_id,
    };
    if (peso != null) insert.peso = peso;
    const { data } = await supabase
      .from("cartoes")
      .insert(insert)
      .select()
      .single();
    if (data) {
      const enriquecido: CartaoComResumo = {
        ...data,
        etiqueta_ids: [],
        membro_ids: [],
        total_checklist_itens: 0,
        total_checklist_concluidos: 0,
        total_anexos: 0,
      };
      globalMutate(key, [...cartoes, enriquecido], false);
      registrarAtividade({ quadroId, cartaoId: data.id, acao: "criar", entidade: "cartao", detalhes: { titulo: data.titulo } });
      trackClientEvent("card_created", {
        workspace_id: quadro?.workspace_id,
        has_peso: peso != null,
      });

      // Execute automations for card_created
      if (quadro?.workspace_id) {
        const { data: automacoes } = await supabase
          .from("automacoes")
          .select("*")
          .eq("workspace_id", quadro.workspace_id);
        if (automacoes && automacoes.length > 0) {
          await executarAutomacoes(supabase, automacoes, {
            tipo: "card_created",
            config: {},
            cartao_id: data.id,
          });
        }
      }
    }
    return data;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cartoes]);

  async function atualizar(id: string, campos: Partial<Cartao>) {
    const ts = new Date().toISOString();
    const estadoAnterior = cartoes;

    // Optimistic — usa funcao pra pegar estado mais recente do cache (evita race condition)
    globalMutate(
      key,
      (atual: Cartao[] | undefined) => (atual || []).map((c) => (c.id === id ? { ...c, ...campos, atualizado_em: ts } : c)),
      { revalidate: false }
    );

    const { data, error } = await supabase
      .from("cartoes")
      .update({ ...campos, atualizado_em: ts })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      // Rollback: restaurar estado anterior e revalidar
      globalMutate(key, estadoAnterior, { revalidate: true });
      return null;
    }

    globalMutate(
      key,
      (atual: Cartao[] | undefined) => (atual || []).map((c) => (c.id === id ? { ...c, ...data } : c)),
      { revalidate: false }
    );
    registrarAtividade({ quadroId, cartaoId: id, acao: "atualizar", entidade: "cartao", detalhes: { campos: Object.keys(campos) } });
    return data;
  }

  async function excluir(id: string) {
    const cartao = cartoes.find((c) => c.id === id);
    const titulo = cartao?.titulo;
    globalMutate(
      key,
      (atual: Cartao[] | undefined) => (atual || []).filter((c) => c.id !== id),
      { revalidate: false }
    );
    await supabase.from("cartoes").delete().eq("id", id);
    registrarAtividade({ quadroId, cartaoId: id, acao: "excluir", entidade: "cartao", detalhes: { titulo } });
  }

  async function mover(cartaoId: string, novaColunaId: string, novaPosicao: number): Promise<{ blocked?: boolean; reason?: string; done?: boolean; titulo?: string }> {
    const cartao = cartoes.find((c) => c.id === cartaoId);
    const oldColunaId = cartao?.coluna_id;
    const estadoAnterior = cartoes;

    // Optimistic update IMEDIATO — move o card na hora, ANTES de qualquer
    // validação async. Sem isso, o card "piscava" na coluna antiga durante
    // os ~100-300ms das queries de validação (o overlay do drag já sumiu).
    // Se uma validação abaixo bloquear, fazemos rollback.
    globalMutate(
      key,
      (atual: Cartao[] | undefined) => (atual || []).map((c) => c.id === cartaoId ? { ...c, coluna_id: novaColunaId, posicao: novaPosicao } : c),
      { revalidate: false }
    );

    function rollback() {
      globalMutate(key, estadoAnterior, { revalidate: false });
    }

    // Descobre se está movendo para a ÚLTIMA coluna (Concluído).
    // Reusado em duas validações abaixo (PR aberto + deps pendentes).
    let movendoParaConcluido: boolean | null = null;
    async function isMovendoParaConcluido() {
      if (movendoParaConcluido !== null) return movendoParaConcluido;
      const { data: colunas } = await supabase
        .from("colunas")
        .select("id, posicao")
        .eq("quadro_id", quadroId)
        .order("posicao", { ascending: false })
        .limit(1);
      movendoParaConcluido = colunas?.[0]?.id === novaColunaId;
      return movendoParaConcluido;
    }

    // Block: PR aberto
    if (cartao?.pr_numero && cartao.pr_status === "open") {
      if (await isMovendoParaConcluido()) {
        rollback();
        return { blocked: true, reason: "Faça merge ou feche o PR antes de concluir este card." };
      }
    }

    // Block: dependências abertas
    if (await isMovendoParaConcluido()) {
      const { data: bloqueado } = await supabase.rpc("card_bloqueado", { card_id: cartaoId });
      if (bloqueado === true) {
        rollback();
        return {
          blocked: true,
          reason: "Este card depende de outros que ainda não foram concluídos.",
        };
      }
    }

    // Single RPC: move + set data_conclusao + return member IDs
    const { data: result, error: moveErr } = await supabase.rpc("move_card_complete", {
      p_cartao_id: cartaoId,
      p_nova_coluna_id: novaColunaId,
      p_nova_posicao: novaPosicao,
    });

    if (moveErr || result?.error) {
      globalMutate(key, estadoAnterior, { revalidate: true });
      return {};
    }

    // Notify card members if moved to Done
    if (result?.is_done && cartao) {
      const user = await usuarioAtual();
      if (user) {
        const memberIds: string[] = result.member_ids || [];
        const notifyIds = new Set(memberIds);
        notifyIds.add(user.id);
        for (const uid of notifyIds) {
          criarNotificacao({
            userId: uid,
            titulo: `Tarefa concluída: ${cartao.titulo}`,
            mensagem: "O cartão foi movido para Concluído.",
            tipo: "sucesso",
            link: `/quadro/${quadroId}`,
          });
        }
      }
    }

    if (oldColunaId && oldColunaId !== novaColunaId) {
      registrarAtividade({ quadroId, cartaoId, acao: "mover", entidade: "cartao", detalhes: { titulo: cartao?.titulo, coluna_origem_id: oldColunaId, coluna_destino_id: novaColunaId } });

      // Execute automations for card_moved_to_column
      const workspaceId = result?.workspace_id;
      if (workspaceId) {
        const { data: automacoes } = await supabase
          .from("automacoes")
          .select("*")
          .eq("workspace_id", workspaceId);
        if (automacoes && automacoes.length > 0) {
          await executarAutomacoes(supabase, automacoes, {
            tipo: "card_moved_to_column",
            config: { coluna_id: novaColunaId },
            cartao_id: cartaoId,
          });
        }
      }
    }
    return { done: !!result?.is_done, titulo: cartao?.titulo };
  }

  async function reordenarNaColuna(colunaId: string, cartoesOrdenados: CartaoComResumo[]) {
    const atualizados = cartoesOrdenados.map((c, i) => ({ ...c, posicao: i }));
    const outros = cartoes.filter((c) => c.coluna_id !== colunaId);
    globalMutate(key, [...outros, ...atualizados], false);

    // Batch update via RPC — 1 transacao ao inves de N updates individuais
    const updates = atualizados.map((c) => ({
      id: c.id,
      coluna_id: c.coluna_id,
      posicao: c.posicao,
    }));

    const { error } = await supabase.rpc("reorder_cards", {
      p_updates: updates,
    });

    if (error) {
      console.warn("[reorder] RPC failed, falling back to individual updates:", error.message);
      await Promise.all(
        atualizados.map((c) =>
          supabase
            .from("cartoes")
            .update({ posicao: c.posicao, coluna_id: c.coluna_id })
            .eq("id", c.id)
        )
      );
    }
  }

  function buscar() {
    globalMutate(key);
  }

  return { cartoes, carregando, cartoesDaColuna, criar, atualizar, excluir, mover, reordenarNaColuna, buscar };
}
