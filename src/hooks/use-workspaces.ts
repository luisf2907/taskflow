"use client";

import { supabase } from "@/lib/supabase/client";
import { usuarioAtual } from "@/lib/supabase/usuario";
import { Workspace } from "@/types";
import { getRandomProjectColor } from "@/lib/colors";
import { trackClientEvent } from "@/lib/umami";
import useSWR, { mutate as globalMutate } from "swr";

const CHAVE = "workspaces";

async function fetcher() {
  // O RLS ja restringe a query, mas com predicado mais largo do que a lista
  // que queremos mostrar (ver o filtro por vinculo no final):
  //
  //   CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (
  //     criado_por = (select auth.uid()) OR id IN (SELECT my_workspace_ids())
  //   );
  const user = await usuarioAtual();
  if (!user) return [] as Workspace[];

  const [{ data }, { data: vinculos }] = await Promise.all([
    supabase.from("workspaces").select("*").order("nome"),
    // Papel do usuario em cada workspace. Necessario porque as policies de
    // UPDATE/DELETE exigem admin, enquanto a de SELECT aceita qualquer membro
    // — sem isso a UI oferece Editar/Excluir que o banco recusa em silencio.
    supabase
      .from("workspace_usuarios")
      .select("workspace_id, papel")
      .eq("user_id", user.id),
  ]);

  const papelPorWs = new Map<string, "admin" | "membro">();
  (vinculos || []).forEach((v) => papelPorWs.set(v.workspace_id, v.papel));

  // Só workspaces dos quais o usuario e membro de fato. A policy de SELECT
  // aceita tambem `criado_por = auth.uid()` (migration 032, pra cobrir a race
  // do insert), o que faria um workspace de onde ele saiu continuar na lista
  // sem nenhuma acao disponivel.
  return (data || [])
    .filter((w) => papelPorWs.has(w.id))
    .map((w) => ({ ...w, meu_papel: papelPorWs.get(w.id)! })) as Workspace[];
}

export function useWorkspaces() {
  const { data: workspaces = [], isLoading: carregando } = useSWR(CHAVE, fetcher);

  async function criar(
    nome: string,
    descricao?: string,
    cor: string = getRandomProjectColor(),
    icone: string = "folder"
  ) {
    if (!nome.trim()) return null;
    const user = await usuarioAtual();

    // Nota: o trigger `trg_auto_add_workspace_creator` (migration 032) adiciona
    // automaticamente o criador como admin em workspace_usuarios AFTER INSERT.
    // Nao duplicamos essa logica no client.
    const { data } = await supabase
      .from("workspaces")
      .insert({ nome, descricao: descricao || null, cor, icone, criado_por: user?.id || null })
      .select()
      .single();
    if (data) {
      // O trigger acima torna o criador admin — refletimos isso na hora pra
      // que o menu de Editar/Excluir apareca sem esperar revalidacao.
      const criado = { ...data, meu_papel: "admin" as const };
      const novo = [...workspaces, criado].sort((a, b) => a.nome.localeCompare(b.nome));
      globalMutate(CHAVE, novo, false);
      trackClientEvent("workspace_created", {
        is_first: workspaces.length === 0,
      });
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
      globalMutate(
        CHAVE,
        workspaces.map((w) => (w.id === id ? { ...w, ...data } : w)),
        false
      );
    } else {
      // Mesma armadilha do excluir: `workspaces_update` exige admin. Se o
      // update nao pegou, desfazemos o optimistic pra tela nao mentir.
      globalMutate(CHAVE, workspaces, false);
    }
    return data;
  }

  /**
   * Exclui o workspace (o cascade leva sprints, cartoes, wiki e o resto junto).
   *
   * Nao remove da lista antes de confirmar: a policy `workspaces_delete` exige
   * `is_workspace_admin(id)`, mas a de SELECT aceita qualquer membro. Quando o
   * usuario nao e admin, o Postgres nao levanta erro — o DELETE simplesmente
   * casa com zero linhas e o PostgREST responde 200. Por isso checamos as
   * linhas afetadas, e nao so `error`.
   */
  async function excluir(id: string): Promise<{ ok: boolean; erro?: string }> {
    const { data, error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) return { ok: false, erro: error.message };

    if (!data || data.length === 0) {
      return {
        ok: false,
        erro: "Só administradores do workspace podem excluí-lo.",
      };
    }

    globalMutate(CHAVE, workspaces.filter((w) => w.id !== id), false);
    // As sprints do workspace foram junto no cascade.
    globalMutate("quadros");
    return { ok: true };
  }

  /**
   * Sai do workspace — apaga o proprio vinculo em workspace_usuarios.
   *
   * A policy `ws_usuarios_delete` e `(user_id = auth.uid() OR
   * is_workspace_admin(workspace_id))`, entao auto-remocao sempre passa. Quem
   * decide se sair e permitido (ultimo admin nao pode) e a UI, porque o banco
   * nao tem essa nocao.
   */
  async function sair(id: string): Promise<{ ok: boolean; erro?: string }> {
    const user = await usuarioAtual();
    if (!user) return { ok: false, erro: "Sessão expirada. Entre novamente." };

    const { data, error } = await supabase
      .from("workspace_usuarios")
      .delete()
      .eq("workspace_id", id)
      .eq("user_id", user.id)
      .select("id");

    if (error) return { ok: false, erro: error.message };
    if (!data || data.length === 0) {
      return { ok: false, erro: "Você já não pertence a este workspace." };
    }

    globalMutate(CHAVE, workspaces.filter((w) => w.id !== id), false);
    // As sprints do workspace saem de vista junto.
    globalMutate("quadros");
    return { ok: true };
  }

  function buscar() {
    globalMutate(CHAVE);
  }

  return { workspaces, carregando, criar, atualizar, excluir, sair, buscar };
}
