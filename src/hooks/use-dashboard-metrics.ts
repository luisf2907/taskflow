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
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Find all membros entries for this user (across workspaces/boards)
        const { data: meusMembros } = await supabase
          .from("membros")
          .select("id")
          .eq("user_id", user.id);

        if (!meusMembros || meusMembros.length === 0) {
          setLoading(false);
          return;
        }

        const meusMembroIds = meusMembros.map((m) => m.id);

        // Find cards assigned to me via cartao_membros
        const { data: meusCartaoMembros } = await supabase
          .from("cartao_membros")
          .select("cartao_id")
          .in("membro_id", meusMembroIds);

        if (!meusCartaoMembros || meusCartaoMembros.length === 0) {
          setLoading(false);
          return;
        }

        const meusCartaoIds = [...new Set(meusCartaoMembros.map((cm) => cm.cartao_id))];

        // Fetch those cards with column info
        const { data: cartoesData } = await supabase
          .from("cartoes")
          .select(`
            id,
            titulo,
            atualizado_em,
            coluna_id,
            colunas!inner ( nome, quadro_id )
          `)
          .in("id", meusCartaoIds)
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
