"use client";

import { supabase } from "@/lib/supabase/client";
import { AutomacaoLog } from "@/types";
import useSWR from "swr";

export function useAutomacaoLogs(workspaceId: string | undefined) {
  const key = workspaceId ? `automacao-logs-${workspaceId}` : null;

  const { data: logs = [], isLoading: carregando } = useSWR(key, async () => {
    if (!workspaceId) return [];
    const { data } = await supabase
      .from("automacao_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("criado_em", { ascending: false })
      .limit(50);
    return (data || []) as AutomacaoLog[];
  }, { dedupingInterval: 10000 });

  return { logs, carregando };
}
