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

  // Single chain: membros → cartao_membros → cartoes in 2 parallel queries
  const { data: meusMembros } = await supabase
    .from("membros")
    .select("id")
    .eq("user_id", user.id);

  if (!meusMembros?.length) return { recentTasks: [], tasksDoneToday: 0 };

  const meusMembroIds = meusMembros.map((m) => m.id);

  const { data: meusCartaoMembros } = await supabase
    .from("cartao_membros")
    .select("cartao_id")
    .in("membro_id", meusMembroIds);

  if (!meusCartaoMembros?.length) return { recentTasks: [], tasksDoneToday: 0 };

  const meusCartaoIds = [...new Set(meusCartaoMembros.map((cm) => cm.cartao_id))].slice(0, 50);

  const { data: cartoesData } = await supabase
    .from("cartoes")
    .select("id, titulo, atualizado_em, coluna_id, colunas!inner(nome, quadro_id)")
    .in("id", meusCartaoIds)
    .order("atualizado_em", { ascending: false })
    .limit(8);

  if (!cartoesData) return { recentTasks: [], tasksDoneToday: 0 };

  const today = new Date().toISOString().split("T")[0];
  let doneToday = 0;

  const recentTasks = cartoesData.map((c: Record<string, unknown>) => {
    const colunas = c.colunas as { nome: string; quadro_id: string } | null;
    const colunaNome = colunas?.nome || "Coluna";
    const atualizadoEm = c.atualizado_em as string;

    if (
      atualizadoEm.startsWith(today) &&
      (colunaNome.toLowerCase().includes("conclu") || colunaNome.toLowerCase().includes("done"))
    ) {
      doneToday++;
    }

    return {
      id: c.id as string,
      titulo: c.titulo as string,
      coluna_nome: colunaNome,
      quadro_id: colunas?.quadro_id || "",
      atualizado_em: atualizadoEm,
    };
  });

  return { recentTasks, tasksDoneToday: doneToday };
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
