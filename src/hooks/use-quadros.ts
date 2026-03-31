"use client";

import { supabase } from "@/lib/supabase/client";
import { registrarAtividade } from "@/lib/atividades";
import { Quadro, StatusSprint } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

const CHAVE = "quadros";

async function fetcher() {
  // Buscar apenas quadros dos workspaces onde o usuario e membro
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [] as Quadro[];

  const { data: memberships } = await supabase
    .from("workspace_usuarios")
    .select("workspace_id")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return [] as Quadro[];

  const wsIds = memberships.map((m) => m.workspace_id);
  const { data } = await supabase
    .from("quadros")
    .select("*")
    .in("workspace_id", wsIds)
    .order("criado_em", { ascending: false });
  return (data || []) as Quadro[];
}

export function useQuadros() {
  const { data: quadros = [], isLoading: carregando } = useSWR(CHAVE, fetcher);

  interface CriarQuadroOpts {
    nome: string;
    cor?: string;
    workspaceId?: string;
    dataInicio?: string;
    dataFim?: string;
    statusSprint?: StatusSprint;
    meta?: string;
  }

  async function criar(nomeOuOpts: string | CriarQuadroOpts, cor?: string, workspaceId?: string) {
    const opts = typeof nomeOuOpts === "string"
      ? { nome: nomeOuOpts, cor: cor || "#C4841D", workspaceId }
      : nomeOuOpts;

    const { data } = await supabase
      .from("quadros")
      .insert({
        nome: opts.nome,
        cor: opts.cor || "#C4841D",
        workspace_id: opts.workspaceId || null,
        data_inicio: opts.dataInicio || null,
        data_fim: opts.dataFim || null,
        status_sprint: opts.statusSprint || "planejada",
        meta: opts.meta || null,
      })
      .select()
      .single();
    if (data) {
      globalMutate(CHAVE, [data, ...quadros], false);
    }
    return data;
  }

  async function atualizar(id: string, campos: Partial<Quadro>) {
    // Optimistic update — usa função pra pegar o estado mais recente do cache
    globalMutate(CHAVE, (atual: Quadro[] | undefined) =>
      (atual || []).map((q) =>
        q.id === id ? { ...q, ...campos, atualizado_em: new Date().toISOString() } : q
      ),
      { revalidate: false }
    );

    const { data } = await supabase
      .from("quadros")
      .update({ ...campos, atualizado_em: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (data) {
      globalMutate(CHAVE, (atual: Quadro[] | undefined) =>
        (atual || []).map((q) => (q.id === id ? data : q)),
        { revalidate: false }
      );
      if (campos.status_sprint) {
        registrarAtividade({ quadroId: id, acao: "sprint_status", entidade: "sprint", detalhes: { status: campos.status_sprint } });
      }
    }
    return data;
  }

  async function excluir(id: string) {
    globalMutate(CHAVE, quadros.filter((q) => q.id !== id), false);
    await supabase.from("quadros").delete().eq("id", id);
  }

  function buscar() {
    globalMutate(CHAVE);
  }

  return { quadros, carregando, criar, atualizar, excluir, buscar };
}
