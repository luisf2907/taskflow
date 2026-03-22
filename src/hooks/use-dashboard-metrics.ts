"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type RecentTask = {
  id: string;
  titulo: string;
  coluna_nome: string;
  quadro_id: string;
  atualizado_em: string;
};

export function useDashboardMetrics() {
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [tasksDoneToday, setTasksDoneToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Fetch recently updated cards across the platform
        const { data: cartoesData } = await supabase
          .from("cartoes")
          .select(`
            id, 
            titulo, 
            atualizado_em, 
            coluna_id,
            colunas!inner ( nome, quadro_id )
          `)
          .order("atualizado_em", { ascending: false })
          .limit(8);

        if (cartoesData) {
          const mapTasks = cartoesData.map((c: any) => ({
            id: c.id,
            titulo: c.titulo,
            coluna_nome: c.colunas?.nome || "Coluna",
            quadro_id: c.colunas?.quadro_id || "",
            atualizado_em: c.atualizado_em,
          }));
          setRecentTasks(mapTasks);

          // Count how many are in "Done" or "Concluído" today
          const today = new Date().toISOString().split("T")[0];
          const doneToday = mapTasks.filter(
            (t) =>
              t.atualizado_em.startsWith(today) &&
              (t.coluna_nome.toLowerCase().includes("conclu") || t.coluna_nome.toLowerCase().includes("done"))
          ).length;
          setTasksDoneToday(doneToday);
        }
      } catch (err) {
        console.error("Dashboard metrics error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  return { recentTasks, tasksDoneToday, loadingMetrics: loading };
}
