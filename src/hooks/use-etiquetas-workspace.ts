"use client";

import { supabase } from "@/lib/supabase/client";
import { Etiqueta } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(workspaceId: string) {
  return `etiquetas-ws-${workspaceId}`;
}

export function useEtiquetasWorkspace(workspaceId: string) {
  const key = workspaceId ? chave(workspaceId) : null;

  const { data: etiquetas = [], isLoading: carregando } = useSWR(key, async () => {
    const { data } = await supabase
      .from("etiquetas")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("criado_em");
    return (data || []) as Etiqueta[];
  });

  // As tres funcoes abaixo atualizam o cache pela forma funcional, e nao
  // reescrevendo com `etiquetas`. Aquela lista e a do render em que o
  // callback foi criado: duas criacoes seguidas partiam as duas da mesma
  // base, e a segunda apagava a primeira do cache. A etiqueta existia no
  // banco mas sumia da tela — e o cartao que a usava aparecia sem tag,
  // porque a linha do backlog so mostra etiqueta presente nesta lista.
  async function criar(nome: string, cor: string) {
    const { data } = await supabase
      .from("etiquetas")
      .insert({ workspace_id: workspaceId, quadro_id: null, nome, cor })
      .select()
      .single();
    if (data) {
      globalMutate(key, (atual: Etiqueta[] = []) => [...atual, data], false);
    }
    return data;
  }

  async function atualizar(id: string, campos: Partial<Pick<Etiqueta, "nome" | "cor">>) {
    globalMutate(
      key,
      (atual: Etiqueta[] = []) => atual.map((e) => (e.id === id ? { ...e, ...campos } : e)),
      false
    );
    const { data } = await supabase.from("etiquetas").update(campos).eq("id", id).select().single();
    if (data) {
      globalMutate(
        key,
        (atual: Etiqueta[] = []) => atual.map((e) => (e.id === id ? data : e)),
        false
      );
    }
    return data;
  }

  async function excluir(id: string) {
    globalMutate(key, (atual: Etiqueta[] = []) => atual.filter((e) => e.id !== id), false);
    await supabase.from("etiquetas").delete().eq("id", id);
  }

  function buscar() {
    globalMutate(key);
  }

  return { etiquetas, carregando, criar, atualizar, excluir, buscar };
}
