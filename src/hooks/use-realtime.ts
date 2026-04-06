"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { mutate as globalMutate } from "swr";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Debounced mutate to batch rapid-fire realtime events
function createDebouncedMutate(delay = 300) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return (key: string) => {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(key, setTimeout(() => {
      timers.delete(key);
      globalMutate(key);
    }, delay));
  };
}

const debouncedMutate = createDebouncedMutate(300);

export function useRealtimeBoard(quadroId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!quadroId) return;

    const channel = supabase
      .channel(`board-${quadroId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "colunas", filter: `quadro_id=eq.${quadroId}` },
        () => {
          debouncedMutate(`colunas-${quadroId}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cartoes" },
        () => {
          // cartoes nao tem quadro_id direto, entao nao da pra filtrar por board
          // no Supabase Realtime. Debounce ja minimiza o impacto.
          debouncedMutate(`cartoes-${quadroId}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comentarios" },
        (payload) => {
          const cartaoId =
            (payload.new as Record<string, unknown>)?.cartao_id ||
            (payload.old as Record<string, unknown>)?.cartao_id;
          if (cartaoId) {
            debouncedMutate(`comentarios-${cartaoId}`);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quadroId]);
}

export function useRealtimeWorkspace(workspaceId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`workspace-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quadros", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          debouncedMutate("quadros");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atividades", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          debouncedMutate(`atividades-${workspaceId}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cartoes", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          debouncedMutate(`backlog-${workspaceId}`);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);
}

export function useRealtimeAtividades(quadroId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!quadroId) return;

    const channel = supabase
      .channel(`atividades-board-${quadroId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atividades", filter: `quadro_id=eq.${quadroId}` },
        () => {
          debouncedMutate(`atividades-quadro-${quadroId}`);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quadroId]);
}
