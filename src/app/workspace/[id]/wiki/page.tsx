"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { MarkdownEditor } from "@/components/wiki/markdown-editor";
import { MarkdownPreview } from "@/components/wiki/markdown-preview";
import { CardEmbedPicker } from "@/components/wiki/card-embed-picker";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { tiptapJsonToMarkdown, markdownToTiptapJson } from "@/lib/wiki-markdown";
import type { WikiEditMode } from "@/components/wiki/wiki-mode-switcher";
import type { WikiPagina, WikiPaginaTree } from "@/types";
import type { Editor } from "@tiptap/react";
import { BookOpen, Loader2 } from "lucide-react";

export default function WikiPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = params.id;
  const router = useRouter();

  const { perfil, carregando: authLoading } = useAuth();
  const { quadros } = useQuadros();
  const { workspaces } = useWorkspaces();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();

  const workspace = workspaces?.find((w) => w.id === workspaceId);

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
  const [modoEdicao, setModoEdicao] = useState<WikiEditMode>("editor");
  const [markdownTexto, setMarkdownTexto] = useState("");
  const editorRef = useRef<Editor | null>(null);

  // Auto-seleciona a primeira página quando carrega
  useEffect(() => {
    if (!carregando && paginas.length > 0 && !paginaSelecionada) {
      setPaginaSelecionada(paginas[0]);
    }
  }, [carregando, paginas, paginaSelecionada]);

  // Sync paginaSelecionada com dados atuais
  useEffect(() => {
    if (paginaSelecionada) {
      const atualizada = paginas.find((p) => p.id === paginaSelecionada.id);
      if (atualizada && atualizada.atualizado_em !== paginaSelecionada.atualizado_em) {
        setPaginaSelecionada(atualizada);
      }
    }
  }, [paginas, paginaSelecionada]);

  // Redirect para login se não autenticado
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

  const handleSelecionar = useCallback((node: WikiPaginaTree) => {
    const pagina = paginas.find((p) => p.id === node.id);
    if (pagina) {
      setPaginaSelecionada(pagina);
      router.replace(`/workspace/${workspaceId}/wiki/${pagina.slug}`);
    }
  }, [paginas, workspaceId, router]);

  const handleCriarPagina = useCallback(
    async (parentId?: string | null) => {
      const nova = await criarPagina("Nova página", parentId);
      if (nova) {
        setPaginaSelecionada(nova);
        router.replace(`/workspace/${workspaceId}/wiki/${nova.slug}`);
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
      }
      toast.success("Página excluída");
      setPaginaParaExcluir(null);
    },
    [excluirPagina, paginaSelecionada, paginaParaExcluir],
  );

  const handleRenomearPagina = useCallback(
    async (id: string, novoTitulo: string) => {
      await atualizarPagina(id, { titulo: novoTitulo });
    },
    [atualizarPagina],
  );

  const handleTituloChange = useCallback(
    (novoTitulo: string) => {
      if (paginaSelecionada) {
        atualizarPagina(paginaSelecionada.id, { titulo: novoTitulo });
      }
    },
    [paginaSelecionada, atualizarPagina],
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

  // Reset modo quando muda de pagina
  useEffect(() => {
    setModoEdicao("editor");
  }, [paginaSelecionada?.id]);

  const handleNavegar = useCallback(
    (paginaId: string) => {
      const pagina = paginas.find((p) => p.id === paginaId);
      if (pagina) {
        setPaginaSelecionada(pagina);
        router.replace(`/workspace/${workspaceId}/wiki/${pagina.slug}`);
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
          {/* Painel esquerdo — Árvore de páginas */}
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
                  onCapaChange={handleCapaChange}
                  onNavegar={handleNavegar}
                  statusSalvamento={statusSalvamento}
                  workspaceId={workspaceId}
                  paginaId={paginaSelecionada.id}
                  modoEdicao={modoEdicao}
                  onModoChange={handleModoChange}
                />
                {modoEdicao === "editor" ? (
                  <WikiEditor
                    key={paginaSelecionada.id}
                    conteudo={paginaSelecionada.conteudo}
                    onSave={handleSalvarConteudo}
                    workspaceId={workspaceId}
                    paginaId={paginaSelecionada.id}
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
                <div className="text-center">
                  <p className="text-[15px] font-medium mb-1" style={{ color: "var(--tf-text-secondary)" }}>
                    {paginas.length === 0 ? "Sua wiki está vazia" : "Selecione uma página"}
                  </p>
                  <p className="text-[13px]" style={{ color: "var(--tf-text-tertiary)" }}>
                    {paginas.length === 0
                      ? "Crie sua primeira página para começar"
                      : "Escolha uma página na árvore ao lado"}
                  </p>
                </div>
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
