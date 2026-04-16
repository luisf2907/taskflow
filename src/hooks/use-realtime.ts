"use client";

import { useEffect, useRef } from "react";
import { mutate as globalMutate } from "swr";
import { supabase } from "@/lib/supabase/client";
import { debouncedMutate } from "@/lib/debounced-mutate";
import { features } from "@/lib/features";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════
// Realtime hooks — adapter entre drivers
// ═══════════════════════════════════════════════════════════════════════
// Esses hooks inscrevem o cliente em eventos que invalidam o cache SWR
// (via debouncedMutate). Dependendo de REALTIME_DRIVER:
//
//   - supabase       → usa supabase.channel() / postgres_changes (cloud default)
//   - pg-notify-sse  → usa EventSource pra /api/realtime/* (self-hosted leve)
//   - polling        → no-op aqui; SWR recarrega periodicamente via
//                      refreshInterval nos hooks de dados (ver SWRConfig)
//
// Driver e lido de features.realtime.driver, que por sua vez deriva de
// NEXT_PUBLIC_REALTIME_DRIVER em build-time.
// ═══════════════════════════════════════════════════════════════════════

type Driver = "supabase" | "pg-notify-sse" | "polling";

function driver(): Driver {
  return features.realtime.driver;
}

// ─────────────────────────────────────────────────────────────────────────
// Board (quadro) — tabelas: cartoes, colunas, comentarios
// ─────────────────────────────────────────────────────────────────────────

export function useRealtimeBoard(quadroId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    console.log("[realtime] useRealtimeBoard effect — quadroId:", quadroId, "driver:", driver());
    if (!quadroId) return;
    const d = driver();

    // ─── pg-notify-sse (self-hosted) ───
    if (d === "pg-notify-sse") {
      console.log("[realtime] opening SSE pra board", quadroId);
      const es = new EventSource(`/api/realtime/board/${quadroId}`);
      es.addEventListener("open", () => console.log("[realtime] SSE aberto pra board", quadroId));
      es.addEventListener("message", (e) => console.log("[realtime] SSE msg:", e.data));
      esRef.current = es;

      es.addEventListener("cartoes", () => debouncedMutate(`cartoes-${quadroId}`));
      es.addEventListener("colunas", () => debouncedMutate(`colunas-${quadroId}`));
      es.addEventListener("comentarios", (ev) => {
        try {
          const { cartao_id } = JSON.parse((ev as MessageEvent).data);
          if (cartao_id) debouncedMutate(`comentarios-${cartao_id}`);
        } catch {
          // payload invalido — ignora
        }
      });
      es.addEventListener("error", () => {
        // Browser reconecta automaticamente com backoff exponencial.
        // Nao logamos aqui porque fica barulhento.
      });

      return () => {
        es.close();
        esRef.current = null;
      };
    }

    // ─── polling — no-op, SWR cuida via refreshInterval global ───
    if (d === "polling") return;

    // ─── supabase (cloud default) ───
    const channel = supabase
      .channel(`board-${quadroId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "colunas", filter: `quadro_id=eq.${quadroId}` },
        () => debouncedMutate(`colunas-${quadroId}`),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cartoes" },
        () => debouncedMutate(`cartoes-${quadroId}`),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comentarios" },
        (payload) => {
          const cartaoId =
            (payload.new as Record<string, unknown>)?.cartao_id ||
            (payload.old as Record<string, unknown>)?.cartao_id;
          if (cartaoId) debouncedMutate(`comentarios-${cartaoId}`);
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [quadroId]);
}

// ─────────────────────────────────────────────────────────────────────────
// Workspace — tabelas: quadros, atividades, cartoes (backlog)
// ─────────────────────────────────────────────────────────────────────────

export function useRealtimeWorkspace(workspaceId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const d = driver();

    if (d === "pg-notify-sse") {
      const es = new EventSource(`/api/realtime/workspace/${workspaceId}`);
      esRef.current = es;

      es.addEventListener("quadros", () => debouncedMutate("quadros"));
      es.addEventListener("atividades", () =>
        debouncedMutate(`atividades-${workspaceId}`),
      );
      es.addEventListener("cartoes", () =>
        debouncedMutate(`backlog-${workspaceId}`),
      );

      return () => {
        es.close();
        esRef.current = null;
      };
    }

    if (d === "polling") return;

    const channel = supabase
      .channel(`workspace-${workspaceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quadros", filter: `workspace_id=eq.${workspaceId}` },
        () => debouncedMutate("quadros"),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atividades", filter: `workspace_id=eq.${workspaceId}` },
        () => debouncedMutate(`atividades-${workspaceId}`),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cartoes", filter: `workspace_id=eq.${workspaceId}` },
        () => debouncedMutate(`backlog-${workspaceId}`),
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);
}

// ─────────────────────────────────────────────────────────────────────────
// Atividades do board — INSERT only em atividades
// ─────────────────────────────────────────────────────────────────────────

export function useRealtimeAtividades(quadroId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!quadroId) return;
    const d = driver();

    // No pg-notify-sse, atividades vem no stream do board (ja invalida
    // via evento "atividades"). Aqui e o hook especifico por quadro —
    // usamos o endpoint do board mas escutamos so "atividades".
    if (d === "pg-notify-sse") {
      const es = new EventSource(`/api/realtime/board/${quadroId}`);
      es.addEventListener("atividades", () =>
        globalMutate(`atividades-quadro-${quadroId}`),
      );
      return () => es.close();
    }

    if (d === "polling") return;

    const channel = supabase
      .channel(`atividades-board-${quadroId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atividades", filter: `quadro_id=eq.${quadroId}` },
        () => debouncedMutate(`atividades-quadro-${quadroId}`),
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [quadroId]);
}
