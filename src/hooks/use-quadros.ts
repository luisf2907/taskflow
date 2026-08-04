"use client";

import { supabase } from "@/lib/supabase/client";
import { usuarioAtual } from "@/lib/supabase/usuario";
import { carregarBoard } from "@/lib/board-loader";
import { registrarAtividade } from "@/lib/atividades";
import { Quadro, StatusSprint } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

const CHAVE = "quadros";

/** Chave do quadro isolado — ver useQuadro. */
function chaveQuadro(id: string) {
  return `quadro-${id}`;
}

async function fetcher() {
  // Buscar apenas quadros dos workspaces onde o usuario e membro
  const user = await usuarioAtual();
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

/**
 * Um quadro so, pelo id — sem esperar a lista inteira.
 *
 * A pagina do board precisa do `workspace_id` do quadro pra carregar
 * etiquetas, membros e views salvas. Tirar isso de `useQuadros()` custava
 * 2 round-trips (workspace_usuarios -> quadros) antes de qualquer um
 * desses comecar. Aqui o quadro vem junto do carregamento do board, que
 * a pagina ja vai fazer de qualquer jeito — entao e de graca.
 */
export function useQuadro(quadroId: string | null) {
  const { data: quadro = null, isLoading: carregando } = useSWR(
    quadroId ? chaveQuadro(quadroId) : null,
    async () => (await carregarBoard(quadroId!)).quadro,
  );

  return { quadro, carregando };
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
    const ts = new Date().toISOString();

    // Optimistic update — usa função pra pegar o estado mais recente do cache.
    // Espelhamos na chave do quadro isolado (useQuadro) pra que o header do
    // board reflita a mudanca na hora, sem esperar revalidacao.
    globalMutate(CHAVE, (atual: Quadro[] | undefined) =>
      (atual || []).map((q) =>
        q.id === id ? { ...q, ...campos, atualizado_em: ts } : q
      ),
      { revalidate: false }
    );
    globalMutate(
      chaveQuadro(id),
      (atual: Quadro | null | undefined) =>
        atual ? { ...atual, ...campos, atualizado_em: ts } : atual,
      { revalidate: false }
    );

    const { data } = await supabase
      .from("quadros")
      .update({ ...campos, atualizado_em: ts })
      .eq("id", id)
      .select()
      .single();
    if (data) {
      globalMutate(CHAVE, (atual: Quadro[] | undefined) =>
        (atual || []).map((q) => (q.id === id ? data : q)),
        { revalidate: false }
      );
      globalMutate(chaveQuadro(id), data, { revalidate: false });
      if (campos.status_sprint) {
        registrarAtividade({ quadroId: id, acao: "sprint_status", entidade: "sprint", detalhes: { status: campos.status_sprint } });
      }
    }
    return data;
  }

  async function excluir(id: string) {
    globalMutate(CHAVE, quadros.filter((q) => q.id !== id), false);
    globalMutate(chaveQuadro(id), null, { revalidate: false });
    await supabase.from("quadros").delete().eq("id", id);
  }

  function buscar() {
    globalMutate(CHAVE);
  }

  return { quadros, carregando, criar, atualizar, excluir, buscar };
}
