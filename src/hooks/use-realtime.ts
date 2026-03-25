"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { mutate as globalMutate } from "swr";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
          globalMutate(`colunas-${quadroId}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cartoes" },
        () => {
          globalMutate(`cartoes-${quadroId}`);
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
            globalMutate(`comentarios-${cartaoId}`);
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
          globalMutate("quadros");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atividades", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          globalMutate(`atividades-${workspaceId}`);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cartoes", filter: `workspace_id=eq.${workspaceId}` },
        () => {
          globalMutate(`backlog-${workspaceId}`);
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
          globalMutate(`atividades-quadro-${quadroId}`);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quadroId]);
}
