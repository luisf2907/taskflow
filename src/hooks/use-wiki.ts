"use client";

import { supabase } from "@/lib/supabase/client";
import { registrarAtividade } from "@/lib/atividades";
import { buildTree, gerarSlugUnico, slugify } from "@/lib/wiki-utils";
import type { WikiPagina, WikiPaginaTree } from "@/types";
import useSWR, { mutate as globalMutate } from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function chave(workspaceId: string) {
  return `wiki-${workspaceId}`;
}

async function fetchPaginas(workspaceId: string): Promise<WikiPagina[]> {
  const { data } = await supabase
    .from("wiki_paginas")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("posicao");

  return (data || []) as WikiPagina[];
}

export function useWiki(workspaceId: string | null) {
  const key = workspaceId ? chave(workspaceId) : null;

  const { data: paginas = [], isLoading: carregando } = useSWR(
    key,
    () => fetchPaginas(workspaceId!),
  );

  // Árvore computada via memo (flat → tree)
  const arvore = useMemo(() => buildTree(paginas), [paginas]);

  // Slugs existentes para unicidade
  const slugsExistentes = useMemo(() => paginas.map((p) => p.slug), [paginas]);

  // ==========================================
  // CRIAR PÁGINA
  // ==========================================
  const criarPagina = useCallback(
    async (titulo: string, parentId?: string | null) => {
      if (!workspaceId || !key) return null;

      const slug = gerarSlugUnico(titulo, slugsExistentes);

      // Calcula próxima posicao entre siblings
      const siblings = paginas.filter((p) =>
        parentId ? p.parent_id === parentId : !p.parent_id,
      );
      const posicao = siblings.length;

      // Pega user id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("wiki_paginas")
        .insert({
          workspace_id: workspaceId,
          parent_id: parentId || null,
          titulo,
          slug,
          posicao,
          criado_por: user.id,
          atualizado_por: user.id,
        })
        .select()
        .single();

      if (error || !data) return null;

      // Optimistic update
      globalMutate(key, [...paginas, data as WikiPagina], false);

      registrarAtividade({
        workspaceId,
        acao: "criar",
        entidade: "wiki_pagina",
        detalhes: { titulo, slug },
      });

      return data as WikiPagina;
    },
    [workspaceId, key, paginas, slugsExistentes],
  );

  // ==========================================
  // ATUALIZAR PÁGINA (genérico — título, ícone, capa, conteúdo)
  // ==========================================
  const atualizarPagina = useCallback(
    async (id: string, campos: Partial<WikiPagina>) => {
      if (!key) return null;

      const ts = new Date().toISOString();
      const estadoAnterior = paginas;

      // Se título mudou, atualiza slug
      const updateData: Record<string, unknown> = {
        ...campos,
        atualizado_em: ts,
      };

      if (campos.titulo) {
        const outrosSlugs = paginas
          .filter((p) => p.id !== id)
          .map((p) => p.slug);
        updateData.slug = gerarSlugUnico(campos.titulo, outrosSlugs);
      }

      // Pega user id para atualizado_por
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) updateData.atualizado_por = user.id;

      // Optimistic
      globalMutate(
        key,
        (atual: WikiPagina[] | undefined) =>
          (atual || []).map((p) =>
            p.id === id ? { ...p, ...updateData } : p,
          ),
        { revalidate: false },
      );

      const { data, error } = await supabase
        .from("wiki_paginas")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error || !data) {
        // Rollback
        globalMutate(key, estadoAnterior, { revalidate: true });
        return null;
      }

      // Atualiza cache com dados reais do servidor
      globalMutate(
        key,
        (atual: WikiPagina[] | undefined) =>
          (atual || []).map((p) => (p.id === id ? { ...p, ...data } : p)),
        { revalidate: false },
      );

      // Atividade apenas para mudanças de título (não para cada keystroke de conteúdo)
      if (campos.titulo) {
        registrarAtividade({
          workspaceId: workspaceId!,
          acao: "atualizar",
          entidade: "wiki_pagina",
          detalhes: { titulo: campos.titulo, campos: Object.keys(campos) },
        });
      }

      return data as WikiPagina;
    },
    [key, paginas, workspaceId],
  );

  // ==========================================
  // SALVAR CONTEÚDO (debounced — chamado pelo editor)
  // Sem revalidação global, atualiza só o item no cache
  // ==========================================
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [statusSalvamento, setStatusSalvamento] = useState<"idle" | "salvando" | "salvo">("idle");

  const salvarConteudo = useCallback(
    (id: string, conteudo: Record<string, unknown>) => {
      if (!key) return;

      setStatusSalvamento("salvando");

      // Optimistic imediato no cache local
      globalMutate(
        key,
        (atual: WikiPagina[] | undefined) =>
          (atual || []).map((p) =>
            p.id === id
              ? { ...p, conteudo, atualizado_em: new Date().toISOString() }
              : p,
          ),
        { revalidate: false },
      );

      // Debounce o save real
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const { error } = await supabase
            .from("wiki_paginas")
            .update({
              conteudo,
              atualizado_por: user?.id || null,
              atualizado_em: new Date().toISOString(),
            })
            .eq("id", id);

          setStatusSalvamento(error ? "idle" : "salvo");
          if (!error) {
            setTimeout(() => setStatusSalvamento("idle"), 2000);
          }
        } catch {
          setStatusSalvamento("idle");
        }
      }, 800);
    },
    [key],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ==========================================
  // EXCLUIR PÁGINA
  // ==========================================
  const excluirPagina = useCallback(
    async (id: string) => {
      if (!key) return;

      const pagina = paginas.find((p) => p.id === id);
      const titulo = pagina?.titulo;

      // Optimistic — remove a página e todas as filhas que agora ficam sem parent
      // (no banco, ON DELETE SET NULL faz filhas virarem raiz)
      globalMutate(
        key,
        (atual: WikiPagina[] | undefined) =>
          (atual || []).filter((p) => p.id !== id).map((p) =>
            p.parent_id === id ? { ...p, parent_id: null } : p,
          ),
        { revalidate: false },
      );

      await supabase.from("wiki_paginas").delete().eq("id", id);

      registrarAtividade({
        workspaceId: workspaceId!,
        acao: "excluir",
        entidade: "wiki_pagina",
        detalhes: { titulo },
      });
    },
    [key, paginas, workspaceId],
  );

  // ==========================================
  // MOVER PÁGINA (reparentar + reposicionar)
  // ==========================================
  const moverPagina = useCallback(
    async (
      id: string,
      novoParentId: string | null,
      novaPosicao: number,
    ) => {
      if (!key) return;

      // Optimistic
      globalMutate(
        key,
        (atual: WikiPagina[] | undefined) =>
          (atual || []).map((p) =>
            p.id === id
              ? { ...p, parent_id: novoParentId, posicao: novaPosicao }
              : p,
          ),
        { revalidate: false },
      );

      await supabase
        .from("wiki_paginas")
        .update({
          parent_id: novoParentId,
          posicao: novaPosicao,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", id);
    },
    [key],
  );

  // ==========================================
  // REORDENAR (batch update posicao para siblings)
  // ==========================================
  const reordenar = useCallback(
    async (ids: string[]) => {
      if (!key) return;

      // Optimistic
      globalMutate(
        key,
        (atual: WikiPagina[] | undefined) =>
          (atual || []).map((p) => {
            const idx = ids.indexOf(p.id);
            return idx >= 0 ? { ...p, posicao: idx } : p;
          }),
        { revalidate: false },
      );

      // Batch update — cada ID recebe posicao = index
      await Promise.all(
        ids.map((id, index) =>
          supabase
            .from("wiki_paginas")
            .update({ posicao: index, atualizado_em: new Date().toISOString() })
            .eq("id", id),
        ),
      );
    },
    [key],
  );

  return {
    paginas,
    arvore,
    carregando,
    statusSalvamento,
    criarPagina,
    atualizarPagina,
    salvarConteudo,
    excluirPagina,
    moverPagina,
    reordenar,
  };
}
