"use client";

import { supabase } from "@/lib/supabase/client";
import { Workspace } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

const CHAVE = "workspaces";

async function fetcher() {
  // Buscar apenas workspaces onde o usuario e membro
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [] as Workspace[];

  const { data: memberships } = await supabase
    .from("workspace_usuarios")
    .select("workspace_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [] as Workspace[];

  const wsIds = memberships.map((m) => m.workspace_id);
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .in("id", wsIds)
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
    if (!nome.trim()) return null;
    const { data: { user } } = await supabase.auth.getUser();

    // Nota: o trigger `trg_auto_add_workspace_creator` no banco adiciona
    // automaticamente o criador como admin em workspace_usuarios AFTER INSERT.
    // Fazemos tambem um upsert defensivo aqui para cobrir bancos sem o trigger
    // (ignoreDuplicates evita 409 se o trigger ja criou a row).
    const { data } = await supabase
      .from("workspaces")
      .insert({ nome, descricao: descricao || null, cor, icone, criado_por: user?.id || null })
      .select()
      .single();
    if (data) {
      // Upsert idempotente — ignora conflito se o trigger ja adicionou o criador
      if (user) {
        await supabase
          .from("workspace_usuarios")
          .upsert(
            { workspace_id: data.id, user_id: user.id, papel: "admin" },
            { onConflict: "workspace_id,user_id", ignoreDuplicates: true }
          );
      }
      const novo = [...workspaces, data].sort((a, b) => a.nome.localeCompare(b.nome));
      globalMutate(CHAVE, novo, false);
    }
    return data;
  }

  async function atualizar(id: string, campos: Partial<Pick<Workspace, "nome" | "descricao" | "cor" | "icone" | "colunas_padrao">>) {
    if (campos.nome !== undefined && !campos.nome.trim()) return null;
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
