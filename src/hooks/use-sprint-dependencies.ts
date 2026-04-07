"use client";

import { supabase } from "@/lib/supabase/client";
import useSWR, { mutate as globalMutate } from "swr";

export interface SprintDependency {
  id: string;
  workspace_id: string;
  sprint_origem: string;
  sprint_destino: string;
  criado_em: string;
}

function chave(workspaceId: string | undefined) {
  return workspaceId ? `sprint-deps-${workspaceId}` : null;
}

export function useSprintDependencies(workspaceId: string | undefined) {
  const { data: deps = [], isLoading: carregando } = useSWR(
    chave(workspaceId),
    async () => {
      if (!workspaceId) return [] as SprintDependency[];
      const { data } = await supabase
        .from("sprint_dependencies")
        .select("*")
        .eq("workspace_id", workspaceId);
      return (data || []) as SprintDependency[];
    }
  );

  async function criar(origem: string, destino: string) {
    if (!workspaceId || origem === destino) return;
    // Otimista
    const novaDep: SprintDependency = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      sprint_origem: origem,
      sprint_destino: destino,
      criado_em: new Date().toISOString(),
    };
    globalMutate(chave(workspaceId), [...deps, novaDep], false);

    const { data, error } = await supabase
      .from("sprint_dependencies")
      .insert({ workspace_id: workspaceId, sprint_origem: origem, sprint_destino: destino })
      .select()
      .single();

    if (error) {
      // Rollback
      globalMutate(chave(workspaceId), deps, false);
      return;
    }
    // Substitui temp pelo real
    globalMutate(
      chave(workspaceId),
      [...deps, data as SprintDependency],
      false
    );
  }

  async function remover(id: string) {
    if (!workspaceId) return;
    globalMutate(chave(workspaceId), deps.filter((d) => d.id !== id), false);
    await supabase.from("sprint_dependencies").delete().eq("id", id);
  }

  return { deps, carregando, criar, remover };
}
