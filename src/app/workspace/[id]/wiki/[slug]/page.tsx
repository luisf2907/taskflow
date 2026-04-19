"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { useIsTabletOrBelow } from "@/hooks/use-is-mobile";
import { useQuadros } from "@/hooks/use-quadros";
import { useWiki } from "@/hooks/use-wiki";
import { toast } from "@/hooks/use-toast";
import { PageTree } from "@/components/wiki/page-tree";
import { PageHeader } from "@/components/wiki/page-header";
import { WikiEditor } from "@/components/wiki/wiki-editor";
import { MarkdownEditor } from "@/components/wiki/markdown-editor";
import { MarkdownPreview } from "@/components/wiki/markdown-preview";
import { CardEmbedPicker } from "@/components/wiki/card-embed-picker";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Drawer } from "@/components/ui/drawer";
import { tiptapJsonToMarkdown, markdownToTiptapJson } from "@/lib/wiki-markdown";
import type { WikiEditMode } from "@/components/wiki/wiki-mode-switcher";
import type { WikiPagina, WikiPaginaTree } from "@/types";
import type { Editor } from "@tiptap/react";
import { BookOpen, Loader2, PanelLeft } from "lucide-react";

export default function WikiSlugPage() {
  const params = useParams<{ id: string; slug: string }>();
  const workspaceId = params.id;
  const slug = params.slug;
  const router = useRouter();

  const { perfil, carregando: authLoading } = useAuth();
  const { quadros } = useQuadros();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();
  const isMobile = useIsTabletOrBelow();
  const [arvoreDrawerAberta, setArvoreDrawerAberta] = useState(false);

  const {
    paginas,
    arvore,
    carregando,
    statusSalvamento,
    criarPagina,
    atualizarPagina,
    salvarConteudo,
    excluirPagina,
  } = useWiki(workspaceId);

  const [paginaSelecionada, setPaginaSelecionada] = useState<WikiPagina | null>(null);
  const [cardPickerAberto, setCardPickerAberto] = useState(false);
  const [paginaParaExcluir, setPaginaParaExcluir] = useState<string | null>(null);

  // Pagina "ao vivo" — sempre deriva da cache `paginas` pelo id selecionado.
  // Garante que toda mutacao otimista (rename, icone, capa) seja refletida
  // no mesmo render, evitando frame de flicker entre cache atualizada e
  // state `paginaSelecionada` ainda stale.
  const paginaAtual = useMemo(() => {
    if (!paginaSelecionada) return null;
    return paginas.find((p) => p.id === paginaSelecionada.id) ?? paginaSelecionada;
  }, [paginas, paginaSelecionada]);
  const [modoEdicao, setModoEdicao] = useState<WikiEditMode>("editor");
  const [markdownTexto, setMarkdownTexto] = useState("");
  const editorRef = useRef<Editor | null>(null);

  // Resolve página pelo slug da URL. set-state-in-effect intencional: sincroniza
  // estado com dados async (SWR) + URL params.
  useEffect(() => {
    if (!carregando && paginas.length > 0 && slug) {
      const pagina = paginas.find((p) => p.slug === slug);
      if (pagina) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPaginaSelecionada(pagina);
      } else if (
        paginaSelecionada &&
        paginas.some((p) => p.id === paginaSelecionada.id)
      ) {
        // Rename em andamento: a pagina ainda existe no cache mas o slug
        // mudou. Nao redireciona — o router.replace(novoSlug) do handler
        // de rename ja esta a caminho. Redirecionar para /wiki aqui causa
        // flicker visivel mostrando brevemente outra pagina.
        return;
      } else {
        router.replace(`/workspace/${workspaceId}/wiki`);
      }
    }
  }, [carregando, paginas, slug, workspaceId, router, paginaSelecionada]);

  // Sync com dados atualizados vindos do backend via SWR.
  useEffect(() => {
    if (paginaSelecionada) {
      const atualizada = paginas.find((p) => p.id === paginaSelecionada.id);
      if (atualizada && atualizada.atualizado_em !== paginaSelecionada.atualizado_em) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPaginaSelecionada(atualizada);
      }
    }
  }, [paginas, paginaSelecionada]);

  useEffect(() => {
    if (!authLoading && !perfil) {
      router.push("/login");
    }
  }, [authLoading, perfil, router]);

  // Listener para abrir card embed picker via slash command
  useEffect(() => {
    const handleCardEmbed = () => setCardPickerAberto(true);
    window.addEventListener("wiki-card-embed", handleCardEmbed);
    return () => window.removeEventListener("wiki-card-embed", handleCardEmbed);
  }, []);

  const handleCardEmbedSelecionar = useCallback(
    (cardId: string) => {
      if (!editorRef.current) return;
      editorRef.current
        .chain()
        .focus()
        .insertContent({ type: "cardEmbed", attrs: { cardId } })
        .run();
    },
    [],
  );

  const handleEditorReady = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  const handleSelecionar = useCallback(
    (node: WikiPaginaTree) => {
      const pagina = paginas.find((p) => p.id === node.id);
      if (pagina) {
        setPaginaSelecionada(pagina);
        setArvoreDrawerAberta(false);
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
    (id: string) => {
      setPaginaParaExcluir(id);
    },
    [],
  );

  const confirmarExclusao = useCallback(
    async () => {
      if (!paginaParaExcluir) return;
      await excluirPagina(paginaParaExcluir);
      if (paginaSelecionada?.id === paginaParaExcluir) {
        setPaginaSelecionada(null);
        router.push(`/workspace/${workspaceId}/wiki`);
      }
      toast.success("Página excluída");
      setPaginaParaExcluir(null);
    },
    [excluirPagina, paginaSelecionada, paginaParaExcluir, workspaceId, router],
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

  const handleCapaChange = useCallback(
    (novaCapaUrl: string | null) => {
      if (paginaSelecionada) {
        atualizarPagina(paginaSelecionada.id, { capa_url: novaCapaUrl } as Partial<WikiPagina>);
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

  const handleModoChange = useCallback(
    (novoModo: WikiEditMode) => {
      if (novoModo === "markdown" && paginaSelecionada?.conteudo) {
        const md = tiptapJsonToMarkdown(paginaSelecionada.conteudo);
        setMarkdownTexto(md);
      } else if (novoModo === "editor" && markdownTexto) {
        const json = markdownToTiptapJson(markdownTexto);
        handleSalvarConteudo(json);
      }
      setModoEdicao(novoModo);
    },
    [paginaSelecionada, markdownTexto, handleSalvarConteudo],
  );

  const handleMarkdownChange = useCallback(
    (texto: string) => {
      setMarkdownTexto(texto);
      if (paginaSelecionada) {
        const json = markdownToTiptapJson(texto);
        salvarConteudo(paginaSelecionada.id, json);
      }
    },
    [paginaSelecionada, salvarConteudo],
  );

  // Reset modo quando muda de página. set-state-in-effect intencional: reage a
  // mudança de página selecionada.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModoEdicao("editor");
  }, [paginaSelecionada?.id]);

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
          className="flex-1 rounded-none md:rounded-[var(--tf-radius-xl)] mb-4 overflow-hidden flex scroll-clip-lg"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
          }}
        >
          {/* Painel esquerdo — Árvore (desktop) */}
          {!isMobile && (
            <div
              className="w-[260px] shrink-0 flex flex-col border-r overflow-hidden"
              style={{ borderColor: "var(--tf-border)" }}
            >
              <PageTree
                arvore={arvore}
                paginaAtivaId={paginaAtual?.id || null}
                onSelecionar={handleSelecionar}
                onCriarPagina={handleCriarPagina}
                onExcluirPagina={handleExcluirPagina}
                onRenomearPagina={handleRenomearPagina}
              />
            </div>
          )}

          {/* Arvore como drawer em mobile */}
          {isMobile && (
            <Drawer
              aberto={arvoreDrawerAberta}
              onFechar={() => setArvoreDrawerAberta(false)}
              lado="left"
              titulo="Páginas"
              larguraMax="min(86vw, 320px)"
            >
              <PageTree
                arvore={arvore}
                paginaAtivaId={paginaAtual?.id || null}
                onSelecionar={handleSelecionar}
                onCriarPagina={handleCriarPagina}
                onExcluirPagina={handleExcluirPagina}
                onRenomearPagina={handleRenomearPagina}
              />
            </Drawer>
          )}

          {/* Painel direito — Editor */}
          <main id="main-content" className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {isMobile && (
              <div
                className="flex items-center gap-2 px-3 py-2 shrink-0 sticky top-0 z-10"
                style={{
                  background: "var(--tf-surface)",
                  borderBottom: "1px solid var(--tf-border)",
                }}
              >
                <button
                  onClick={() => setArvoreDrawerAberta(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-[var(--tf-radius-xs)] transition-colors hover:bg-[var(--tf-surface-hover)]"
                  style={{ color: "var(--tf-text-secondary)" }}
                  aria-label="Abrir arvore de paginas"
                >
                  <PanelLeft size={18} strokeWidth={1.75} />
                </button>
                <span
                  className="text-[0.8125rem] font-medium truncate"
                  style={{ color: "var(--tf-text)" }}
                >
                  {paginaAtual?.titulo || "Wiki"}
                </span>
              </div>
            )}
            {carregando ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--tf-accent)" }} />
              </div>
            ) : paginaAtual ? (
              <div className="max-w-[900px] mx-auto w-full px-3 md:px-8 py-4 md:py-10">
                <PageHeader
                  pagina={paginaAtual}
                  todasPaginas={paginas}
                  onTituloChange={handleTituloChange}
                  onIconeChange={handleIconeChange}
                  onCapaChange={handleCapaChange}
                  onNavegar={handleNavegar}
                  statusSalvamento={statusSalvamento}
                  workspaceId={workspaceId}
                  paginaId={paginaAtual.id}
                  modoEdicao={modoEdicao}
                  onModoChange={handleModoChange}
                />
                {modoEdicao === "editor" ? (
                  <WikiEditor
                    key={paginaAtual.id}
                    conteudo={paginaAtual.conteudo}
                    onSave={handleSalvarConteudo}
                    workspaceId={workspaceId}
                    paginaId={paginaAtual.id}
                    onEditorReady={handleEditorReady}
                  />
                ) : (
                  <div className="flex gap-0 -mx-8" style={{ minHeight: "400px" }}>
                    <div
                      className="flex-1 min-w-0 overflow-auto border-r"
                      style={{ borderColor: "var(--tf-border)" }}
                    >
                      <MarkdownEditor
                        value={markdownTexto}
                        onChange={handleMarkdownChange}
                      />
                    </div>
                    <div className="flex-1 min-w-0 overflow-auto">
                      <MarkdownPreview conteudo={markdownTexto} />
                    </div>
                  </div>
                )}
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

      <CardEmbedPicker
        workspaceId={workspaceId}
        aberto={cardPickerAberto}
        onFechar={() => setCardPickerAberto(false)}
        onSelecionar={handleCardEmbedSelecionar}
      />

      <ConfirmModal
        aberto={!!paginaParaExcluir}
        onFechar={() => setPaginaParaExcluir(null)}
        onConfirmar={confirmarExclusao}
        titulo="Excluir pagina"
        mensagem="Tem certeza que deseja excluir esta pagina? Sub-paginas ficarao como paginas raiz. Esta acao nao pode ser desfeita."
        textoBotaoConfirmar="Excluir"
        danger
      />
    </div>
  );
}
