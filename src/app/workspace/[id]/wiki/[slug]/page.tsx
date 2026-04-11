"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useWiki } from "@/hooks/use-wiki";
import { toast } from "@/hooks/use-toast";
import { PageTree } from "@/components/wiki/page-tree";
import { PageHeader } from "@/components/wiki/page-header";
import { WikiEditor } from "@/components/wiki/wiki-editor";
import type { WikiPagina, WikiPaginaTree } from "@/types";
import { BookOpen, Loader2 } from "lucide-react";

export default function WikiSlugPage() {
  const params = useParams<{ id: string; slug: string }>();
  const workspaceId = params.id;
  const slug = params.slug;
  const router = useRouter();

  const { perfil, carregando: authLoading } = useAuth();
  const { quadros } = useQuadros();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();

  const {
    paginas,
    arvore,
    carregando,
    criarPagina,
    atualizarPagina,
    salvarConteudo,
    excluirPagina,
  } = useWiki(workspaceId);

  const [paginaSelecionada, setPaginaSelecionada] = useState<WikiPagina | null>(null);

  // Resolve página pelo slug da URL
  useEffect(() => {
    if (!carregando && paginas.length > 0 && slug) {
      const pagina = paginas.find((p) => p.slug === slug);
      if (pagina) {
        setPaginaSelecionada(pagina);
      } else {
        router.replace(`/workspace/${workspaceId}/wiki`);
      }
    }
  }, [carregando, paginas, slug, workspaceId, router]);

  // Sync com dados atualizados
  useEffect(() => {
    if (paginaSelecionada) {
      const atualizada = paginas.find((p) => p.id === paginaSelecionada.id);
      if (atualizada && atualizada.atualizado_em !== paginaSelecionada.atualizado_em) {
        setPaginaSelecionada(atualizada);
      }
    }
  }, [paginas, paginaSelecionada]);

  useEffect(() => {
    if (!authLoading && !perfil) {
      router.push("/login");
    }
  }, [authLoading, perfil, router]);

  const handleSelecionar = useCallback(
    (node: WikiPaginaTree) => {
      const pagina = paginas.find((p) => p.id === node.id);
      if (pagina) {
        setPaginaSelecionada(pagina);
        router.push(`/workspace/${workspaceId}/wiki/${pagina.slug}`);
      }
    },
    [paginas, workspaceId, router],
  );

  const handleCriarPagina = useCallback(
    async (parentId?: string | null) => {
      const nova = await criarPagina("Nova página", parentId);
      if (nova) {
        setPaginaSelecionada(nova);
        router.push(`/workspace/${workspaceId}/wiki/${nova.slug}`);
        toast.success("Página criada!");
      }
    },
    [criarPagina, workspaceId, router],
  );

  const handleExcluirPagina = useCallback(
    async (id: string) => {
      if (!confirm("Excluir esta página? Sub-páginas ficarão como raiz.")) return;
      await excluirPagina(id);
      if (paginaSelecionada?.id === id) {
        setPaginaSelecionada(null);
        router.push(`/workspace/${workspaceId}/wiki`);
      }
      toast.success("Página excluída");
    },
    [excluirPagina, paginaSelecionada, workspaceId, router],
  );

  const handleRenomearPagina = useCallback(
    async (id: string, novoTitulo: string) => {
      const result = await atualizarPagina(id, { titulo: novoTitulo });
      if (result && paginaSelecionada?.id === id) {
        router.replace(`/workspace/${workspaceId}/wiki/${result.slug}`);
      }
    },
    [atualizarPagina, paginaSelecionada, workspaceId, router],
  );

  const handleTituloChange = useCallback(
    async (novoTitulo: string) => {
      if (paginaSelecionada) {
        const result = await atualizarPagina(paginaSelecionada.id, { titulo: novoTitulo });
        if (result) {
          router.replace(`/workspace/${workspaceId}/wiki/${result.slug}`);
        }
      }
    },
    [paginaSelecionada, atualizarPagina, workspaceId, router],
  );

  const handleIconeChange = useCallback(
    (novoIcone: string | null) => {
      if (paginaSelecionada) {
        atualizarPagina(paginaSelecionada.id, { icone: novoIcone } as Partial<WikiPagina>);
      }
    },
    [paginaSelecionada, atualizarPagina],
  );

  const handleSalvarConteudo = useCallback(
    (conteudo: Record<string, unknown>) => {
      if (paginaSelecionada) {
        salvarConteudo(paginaSelecionada.id, conteudo);
      }
    },
    [paginaSelecionada, salvarConteudo],
  );

  const handleNavegar = useCallback(
    (paginaId: string) => {
      const pagina = paginas.find((p) => p.id === paginaId);
      if (pagina) {
        setPaginaSelecionada(pagina);
        router.push(`/workspace/${workspaceId}/wiki/${pagina.slug}`);
      }
    },
    [paginas, workspaceId, router],
  );

  if (authLoading || !iniciado || !perfil) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "var(--tf-bg)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--tf-accent)" }} />
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden" style={{ background: "var(--tf-bg)" }}>
      {iniciado && (
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => {}}
          aberta={sidebarAberta}
          onToggle={toggleSidebar}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header onMenuMobile={toggleSidebar} />

        <div
          className="flex-1 rounded-[32px] mb-4 overflow-hidden flex scroll-clip-lg"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
          }}
        >
          {/* Painel esquerdo — Árvore */}
          <div
            className="w-[260px] shrink-0 flex flex-col border-r overflow-hidden"
            style={{ borderColor: "var(--tf-border)" }}
          >
            <PageTree
              arvore={arvore}
              paginaAtivaId={paginaSelecionada?.id || null}
              onSelecionar={handleSelecionar}
              onCriarPagina={handleCriarPagina}
              onExcluirPagina={handleExcluirPagina}
              onRenomearPagina={handleRenomearPagina}
            />
          </div>

          {/* Painel direito — Editor */}
          <main id="main-content" className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {carregando ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--tf-accent)" }} />
              </div>
            ) : paginaSelecionada ? (
              <div className="max-w-[900px] mx-auto w-full px-8 py-10">
                <PageHeader
                  pagina={paginaSelecionada}
                  todasPaginas={paginas}
                  onTituloChange={handleTituloChange}
                  onIconeChange={handleIconeChange}
                  onNavegar={handleNavegar}
                />
                <WikiEditor
                  key={paginaSelecionada.id}
                  conteudo={paginaSelecionada.conteudo}
                  onSave={handleSalvarConteudo}
                  workspaceId={workspaceId}
                  paginaId={paginaSelecionada.id}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <BookOpen size={48} strokeWidth={1.2} style={{ color: "var(--tf-border)" }} />
                <p className="text-[13px]" style={{ color: "var(--tf-text-tertiary)" }}>
                  Página não encontrada
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
