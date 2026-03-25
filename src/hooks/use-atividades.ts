"use client";

import { supabase } from "@/lib/supabase/client";
import type { AtividadeComAutor } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

export function useAtividadesWorkspace(workspaceId: string | null, limite = 50) {
  const key = workspaceId ? `atividades-${workspaceId}` : null;
  const { data: atividades = [], isLoading: carregando } = useSWR(key, async () => {
    if (!workspaceId) return [];
    const { data } = await supabase
      .from("atividades")
      .select("*, perfis(*)")
      .eq("workspace_id", workspaceId)
      .order("criado_em", { ascending: false })
      .limit(limite);
    return (data || []) as AtividadeComAutor[];
  });
  return { atividades, carregando, buscar: () => key && globalMutate(key) };
}

export function useAtividadesQuadro(quadroId: string | null, limite = 30) {
  const key = quadroId ? `atividades-quadro-${quadroId}` : null;
  const { data: atividades = [], isLoading: carregando } = useSWR(key, async () => {
    if (!quadroId) return [];
    const { data } = await supabase
      .from("atividades")
      .select("*, perfis(*)")
      .eq("quadro_id", quadroId)
      .order("criado_em", { ascending: false })
      .limit(limite);
    return (data || []) as AtividadeComAutor[];
  });
  return { atividades, carregando, buscar: () => key && globalMutate(key) };
}
