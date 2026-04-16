"use client";

import { supabase } from "@/lib/supabase/client";
import { debouncedMutate } from "@/lib/debounced-mutate";
import { features } from "@/lib/features";
import { PokerSessao, PokerVoto } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "./use-auth";
import { useMembrosWorkspace } from "./use-membros-workspace";
import type { RealtimeChannel } from "@supabase/supabase-js";

// =============================================
// TYPES INTERNOS
// =============================================
interface PokerData {
  sessao: PokerSessao | null;
  votos: PokerVoto[];
}

// =============================================
// SWR FETCHER
// =============================================
function chave(workspaceId: string) {
  return `poker-${workspaceId}`;
}

async function fetchPoker(workspaceId: string): Promise<PokerData> {
  // Buscar sessao ativa (nao finalizada) mais recente
  const { data: sessao } = await supabase
    .from("poker_sessoes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .neq("status", "finalizado")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sessao) return { sessao: null, votos: [] };

  // Buscar votos da sessao
  const { data: votos } = await supabase
    .from("poker_votos")
    .select("*")
    .eq("sessao_id", sessao.id)
    .order("criado_em");

  return {
    sessao: sessao as PokerSessao,
    votos: (votos || []) as PokerVoto[],
  };
}

// =============================================
// HOOK PRINCIPAL
// =============================================
export function usePlanningPoker(workspaceId: string) {
  const key = chave(workspaceId);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { user } = useAuth();
  const { membros } = useMembrosWorkspace(workspaceId);

  const { data, isLoading: carregando } = useSWR(key, () => fetchPoker(workspaceId));

  const sessaoAtiva = data?.sessao ?? null;
  const votos = data?.votos ?? [];

  // Membro atual (pelo user_id)
  const meuMembro = membros.find((m) => m.user_id === user?.id) ?? null;
  const meuVoto = votos.find((v) => v.user_id === user?.id) ?? null;

  // =============================================
  // REALTIME
  // =============================================
  useEffect(() => {
    if (!workspaceId) return;
    const driver = features.realtime.driver;

    // ─── pg-notify-sse: reusa endpoint de workspace (ja inclui poker) ───
    if (driver === "pg-notify-sse") {
      const es = new EventSource(`/api/realtime/workspace/${workspaceId}`);
      es.addEventListener("poker_sessoes", () => debouncedMutate(key));
      es.addEventListener("poker_votos", () => debouncedMutate(key));
      return () => es.close();
    }

    if (driver === "polling") return;

    // ─── supabase (cloud default) ───
    const channel = supabase
      .channel(`poker-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poker_sessoes", filter: `workspace_id=eq.${workspaceId}` },
        () => { debouncedMutate(key); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poker_votos" },
        () => { debouncedMutate(key); }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, key]);

  // =============================================
  // ACOES
  // =============================================

  /** Criar nova sessao de estimativa para um cartao */
  // deps usam `user` (não `user?.id`) pra bater com o que o React Compiler infere
  const iniciarSessao = useCallback(async (cartaoId: string) => {
    if (!user?.id) return null;

    const { data: nova, error } = await supabase
      .from("poker_sessoes")
      .insert({
        workspace_id: workspaceId,
        cartao_id: cartaoId,
        criado_por: user.id,
        status: "votando",
      })
      .select()
      .single();

    if (error) {
      // Provavelmente ja existe sessao ativa para o cartao
      if (error.code === "23505") return null;
      return null;
    }

    // Optimistic
    globalMutate(key, { sessao: nova as PokerSessao, votos: [] }, false);
    return nova as PokerSessao;
  }, [user, workspaceId, key]);

  /** Votar (upsert — substitui voto anterior) */
  const votar = useCallback(async (valor: string) => {
    if (!sessaoAtiva || !user?.id || !meuMembro) return;

    // Optimistic
    const votoTemp: PokerVoto = {
      id: crypto.randomUUID(),
      sessao_id: sessaoAtiva.id,
      membro_id: meuMembro.id,
      user_id: user.id,
      valor,
      criado_em: new Date().toISOString(),
    };

    const votosAtualizados = meuVoto
      ? votos.map((v) => (v.user_id === user.id ? { ...v, valor } : v))
      : [...votos, votoTemp];

    globalMutate(key, { sessao: sessaoAtiva, votos: votosAtualizados }, false);

    // Persist (upsert)
    await supabase
      .from("poker_votos")
      .upsert(
        {
          sessao_id: sessaoAtiva.id,
          membro_id: meuMembro.id,
          user_id: user.id,
          valor,
        },
        { onConflict: "sessao_id,user_id" }
      );

    globalMutate(key);
  }, [sessaoAtiva, user, meuMembro, meuVoto, votos, key]);

  /** Revelar votos (muda status para 'revelado') */
  const revelarVotos = useCallback(async () => {
    if (!sessaoAtiva) return;

    // Optimistic
    globalMutate(key, {
      sessao: { ...sessaoAtiva, status: "revelado" as const },
      votos,
    }, false);

    await supabase
      .from("poker_sessoes")
      .update({ status: "revelado", atualizado_em: new Date().toISOString() })
      .eq("id", sessaoAtiva.id);

    globalMutate(key);
  }, [sessaoAtiva, votos, key]);

  /** Resetar votos (voltar a votar) */
  const resetarVotos = useCallback(async () => {
    if (!sessaoAtiva) return;

    // Optimistic
    globalMutate(key, {
      sessao: { ...sessaoAtiva, status: "votando" as const },
      votos: [],
    }, false);

    // Deletar votos e voltar status
    await Promise.all([
      supabase.from("poker_votos").delete().eq("sessao_id", sessaoAtiva.id),
      supabase.from("poker_sessoes")
        .update({ status: "votando", atualizado_em: new Date().toISOString() })
        .eq("id", sessaoAtiva.id),
    ]);

    globalMutate(key);
  }, [sessaoAtiva, key]);

  /** Finalizar sessao e salvar peso no cartao */
  const finalizarSessao = useCallback(async (valorFinal: number) => {
    if (!sessaoAtiva) return;

    // Optimistic: fechar sessao
    globalMutate(key, { sessao: null, votos: [] }, false);

    await Promise.all([
      supabase
        .from("poker_sessoes")
        .update({
          status: "finalizado",
          resultado_final: valorFinal,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", sessaoAtiva.id),
      supabase
        .from("cartoes")
        .update({ peso: valorFinal })
        .eq("id", sessaoAtiva.cartao_id),
    ]);

    // Revalidar backlog tambem
    globalMutate(key);
    globalMutate(`backlog-${workspaceId}`);
  }, [sessaoAtiva, workspaceId, key]);

  /** Cancelar/fechar sessao sem salvar */
  const fecharSessao = useCallback(async () => {
    if (!sessaoAtiva) return;

    // Optimistic
    globalMutate(key, { sessao: null, votos: [] }, false);

    await supabase.from("poker_sessoes").delete().eq("id", sessaoAtiva.id);

    globalMutate(key);
  }, [sessaoAtiva, key]);

  // =============================================
  // ESTATISTICAS
  // =============================================
  const estatisticas = useMemo(() => {
    const numericos = votos
      .map((v) => v.valor)
      .filter((v) => v !== "?" && v !== "cafe")
      .map(Number)
      .filter((n) => !isNaN(n));

    if (numericos.length === 0) return { media: 0, moda: 0, consenso: false, spread: 0 };

    const soma = numericos.reduce((a, b) => a + b, 0);
    const media = Math.round((soma / numericos.length) * 10) / 10;

    // Moda (valor mais frequente)
    const freq: Record<number, number> = {};
    numericos.forEach((n) => { freq[n] = (freq[n] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    const moda = Number(Object.entries(freq).find(([, f]) => f === maxFreq)?.[0] ?? 0);

    const min = Math.min(...numericos);
    const max = Math.max(...numericos);
    const spread = max - min;
    const consenso = spread === 0 && numericos.length > 1;

    return { media, moda, consenso, spread };
  }, [votos]);

  return {
    sessaoAtiva,
    votos,
    carregando,
    meuMembro,
    meuVoto,
    estatisticas,
    iniciarSessao,
    votar,
    revelarVotos,
    resetarVotos,
    finalizarSessao,
    fecharSessao,
  };
}
