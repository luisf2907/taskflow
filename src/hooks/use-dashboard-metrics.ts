"use client";

import { supabase } from "@/lib/supabase/client";
import useSWR from "swr";

export type RecentTask = {
  id: string;
  titulo: string;
  coluna_nome: string;
  quadro_id: string;
  atualizado_em: string;
};

async function fetchMetrics(): Promise<{ recentTasks: RecentTask[]; tasksDoneToday: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { recentTasks: [], tasksDoneToday: 0 };

  // Single RPC call replaces 3 sequential queries
  const { data, error } = await supabase.rpc("get_dashboard_metrics", {
    p_user_id: user.id,
  });

  if (error || !data) {
    console.warn("[dashboard-metrics] RPC failed, returning empty:", error?.message);
    return { recentTasks: [], tasksDoneToday: 0 };
  }

  return {
    recentTasks: data.recentTasks || [],
    tasksDoneToday: data.tasksDoneToday || 0,
  };
}

export function useDashboardMetrics() {
  const { data, isLoading } = useSWR("dashboard-metrics", fetchMetrics, {
    dedupingInterval: 60000,
    revalidateOnFocus: false,
  });

  return {
    recentTasks: data?.recentTasks || [],
    tasksDoneToday: data?.tasksDoneToday || 0,
    loadingMetrics: isLoading,
  };
}
