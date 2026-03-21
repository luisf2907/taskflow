"use client";

import { supabase } from "@/lib/supabase/client";
import { Workspace } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

const CHAVE = "workspaces";

async function fetcher() {
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .order("nome");
  return (data || []) as Workspace[];
}

export function useWorkspaces() {
  const { data: workspaces = [], isLoading: carregando } = useSWR(CHAVE, fetcher);

  async function criar(
    nome: string,
    descricao?: string,
    cor: string = "#C4841D",
    icone: string = "folder"
  ) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("workspaces")
      .insert({ nome, descricao: descricao || null, cor, icone, criado_por: user?.id || null })
      .select()
      .single();
    if (data) {
      // Adicionar criador como admin do workspace
      if (user) {
        await supabase.from("workspace_usuarios").insert({
          workspace_id: data.id,
          user_id: user.id,
          papel: "admin",
        });
      }
      const novo = [...workspaces, data].sort((a, b) => a.nome.localeCompare(b.nome));
      globalMutate(CHAVE, novo, false);
    }
    return data;
  }

  async function atualizar(id: string, campos: Partial<Pick<Workspace, "nome" | "descricao" | "cor" | "icone" | "colunas_padrao">>) {
    // Optimistic
    globalMutate(
      CHAVE,
      workspaces.map((w) => (w.id === id ? { ...w, ...campos } : w)),
      false
    );

    const { data } = await supabase
      .from("workspaces")
      .update({ ...campos, atualizado_em: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (data) {
      globalMutate(CHAVE, workspaces.map((w) => (w.id === id ? data : w)), false);
    }
    return data;
  }

  async function excluir(id: string) {
    globalMutate(CHAVE, workspaces.filter((w) => w.id !== id), false);
    await supabase.from("workspaces").delete().eq("id", id);
  }

  function buscar() {
    globalMutate(CHAVE);
  }

  return { workspaces, carregando, criar, atualizar, excluir, buscar };
}
