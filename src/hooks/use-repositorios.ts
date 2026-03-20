"use client";

import { supabase } from "@/lib/supabase/client";
import { Repositorio } from "@/types/github";
import useSWR, { mutate as globalMutate } from "swr";

function chave(workspaceId: string) {
  return `repositorios-${workspaceId}`;
}

export function useRepositorios(workspaceId: string) {
  const key = chave(workspaceId);

  const { data: repositorios = [], isLoading: carregando } = useSWR(key, async () => {
    const { data } = await supabase
      .from("repositorios")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("criado_em", { ascending: false });
    return (data || []) as Repositorio[];
  });

  async function conectar(owner: string, nome: string) {
    // Verificar se já existe
    const existe = repositorios.find((r) => r.owner === owner && r.nome === nome);
    if (existe) return existe;

    const { data } = await supabase
      .from("repositorios")
      .insert({ workspace_id: workspaceId, owner, nome })
      .select()
      .single();
    if (data) globalMutate(key, [...repositorios, data as Repositorio], false);
    return data as Repositorio | null;
  }

  async function desconectar(id: string) {
    globalMutate(key, repositorios.filter((r) => r.id !== id), false);
    await supabase.from("repositorios").delete().eq("id", id);
  }

  return { repositorios, carregando, conectar, desconectar };
}
