"use client";

import { supabase } from "@/lib/supabase/client";
import { FiltrosSalvos, ViewSalva } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(workspaceId: string, quadroId: string | null) {
  return `views-salvas-${workspaceId}-${quadroId ?? "all"}`;
}

/** Hook de views salvas para um quadro. RLS já filtra: traz apenas as minhas
 *  + as compartilhadas do workspace. */
export function useViewsSalvas(workspaceId: string | null, quadroId: string | null) {
  const key = workspaceId ? chave(workspaceId, quadroId) : null;

  const { data: views = [], isLoading: carregando } = useSWR(key, async () => {
    if (!workspaceId) return [] as ViewSalva[];
    let q = supabase
      .from("views_salvas")
      .select("*")
      .eq("workspace_id", workspaceId);
    // Inclui views do quadro específico OU sem quadro (workspace-wide).
    if (quadroId) {
      q = q.or(`quadro_id.eq.${quadroId},quadro_id.is.null`);
    }
    const { data } = await q.order("criado_em", { ascending: true });
    return (data || []) as ViewSalva[];
  });

  async function criar(input: {
    nome: string;
    filtros: FiltrosSalvos;
    compartilhada: boolean;
  }) {
    if (!workspaceId) return null;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("views_salvas")
      .insert({
        workspace_id: workspaceId,
        quadro_id: quadroId,
        usuario_id: userId,
        nome: input.nome.trim(),
        filtros: input.filtros,
        compartilhada: input.compartilhada,
      })
      .select()
      .single();
    if (error) throw error;
    if (data) globalMutate(key, [...views, data], false);
    return data as ViewSalva;
  }

  async function atualizar(
    id: string,
    campos: Partial<Pick<ViewSalva, "nome" | "filtros" | "compartilhada">>
  ) {
    globalMutate(
      key,
      views.map((v) => (v.id === id ? { ...v, ...campos } : v)),
      false
    );
    const { data } = await supabase
      .from("views_salvas")
      .update(campos)
      .eq("id", id)
      .select()
      .single();
    if (data) {
      globalMutate(
        key,
        views.map((v) => (v.id === id ? (data as ViewSalva) : v)),
        false
      );
    }
    return data as ViewSalva | null;
  }

  async function excluir(id: string) {
    globalMutate(
      key,
      views.filter((v) => v.id !== id),
      false
    );
    await supabase.from("views_salvas").delete().eq("id", id);
  }

  function buscar() {
    globalMutate(key);
  }

  return { views, carregando, criar, atualizar, excluir, buscar };
}
