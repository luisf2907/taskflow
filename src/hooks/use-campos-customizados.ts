"use client";

import { supabase } from "@/lib/supabase/client";
import { CampoCustomizado, CampoTipo } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";

function chave(workspaceId: string) {
  return `campos-customizados-${workspaceId}`;
}

/** CRUD de campos customizados do workspace. */
export function useCamposCustomizados(workspaceId: string | null) {
  const key = workspaceId ? chave(workspaceId) : null;

  const { data: campos = [], isLoading: carregando } = useSWR(key, async () => {
    if (!workspaceId) return [] as CampoCustomizado[];
    const { data } = await supabase
      .from("campos_customizados")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("posicao", { ascending: true })
      .order("criado_em", { ascending: true });
    return (data || []) as CampoCustomizado[];
  });

  async function criar(input: {
    nome: string;
    tipo: CampoTipo;
    opcoes?: string[];
  }) {
    if (!workspaceId) return null;
    const proxPos = (campos[campos.length - 1]?.posicao ?? -1) + 1;
    const { data, error } = await supabase
      .from("campos_customizados")
      .insert({
        workspace_id: workspaceId,
        nome: input.nome.trim(),
        tipo: input.tipo,
        opcoes: input.tipo === "select" ? input.opcoes || [] : null,
        posicao: proxPos,
      })
      .select()
      .single();
    if (error) throw error;
    if (data) globalMutate(key, [...campos, data as CampoCustomizado], false);
    return data as CampoCustomizado;
  }

  async function atualizar(
    id: string,
    campos_: Partial<Pick<CampoCustomizado, "nome" | "opcoes" | "posicao">>
  ) {
    globalMutate(
      key,
      campos.map((c) => (c.id === id ? { ...c, ...campos_ } : c)),
      false
    );
    const { data } = await supabase
      .from("campos_customizados")
      .update(campos_)
      .eq("id", id)
      .select()
      .single();
    if (data) {
      globalMutate(
        key,
        campos.map((c) => (c.id === id ? (data as CampoCustomizado) : c)),
        false
      );
    }
    return data as CampoCustomizado | null;
  }

  async function excluir(id: string) {
    globalMutate(
      key,
      campos.filter((c) => c.id !== id),
      false
    );
    await supabase.from("campos_customizados").delete().eq("id", id);
  }

  function buscar() {
    if (key) globalMutate(key);
  }

  return { campos, carregando, criar, atualizar, excluir, buscar };
}
