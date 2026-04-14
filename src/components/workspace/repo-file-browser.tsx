"use client";

import { useGitHubConteudo, useGitHubArquivo } from "@/hooks/use-github";
import type { GitHubConteudo } from "@/types/github";
import { BookOpen, ChevronRight, FileText, Folder } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface RepoFileBrowserProps {
  owner: string;
  nome: string;
  branch: string;
  caminhoAtual?: string;
  onCaminhoChange?: (path: string) => void;
  onAbrirArquivo: (path: string) => void;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function ordenarConteudo(itens: GitHubConteudo[]): GitHubConteudo[] {
  return [...itens].sort((a, b) => {
    if (a.type === "dir" && b.type !== "dir") return -1;
    if (a.type !== "dir" && b.type === "dir") return 1;
    return a.name.localeCompare(b.name);
  });
}

// Larguras pre-computadas pros skeletons (não precisa regenerar a cada render).
const SKELETON_LARGURAS = Array.from({ length: 8 }, () => 120 + Math.random() * 160);
const README_SKELETON_LARGURAS = Array.from({ length: 6 }, () => 40 + Math.random() * 50);

function SkeletonLinhas() {
  return (
    <div className="flex flex-col gap-1">
      {SKELETON_LARGURAS.map((largura, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[8px] px-3 py-2 animate-pulse"
          style={{ backgroundColor: "var(--tf-bg-secondary)" }}
        >
          <div
            className="h-4 w-4 rounded-[4px]"
            style={{ backgroundColor: "var(--tf-border)" }}
          />
          <div
            className="h-4 rounded-[4px] flex-1"
            style={{
              backgroundColor: "var(--tf-border)",
              maxWidth: `${largura}px`,
            }}
          />
          <div
            className="h-4 w-12 rounded-[4px] ml-auto"
            style={{ backgroundColor: "var(--tf-border)" }}
          />
        </div>
      ))}
    </div>
  );
}

export function RepoFileBrowser({
  owner,
  nome,
  branch,
  caminhoAtual: caminhoExterno,
  onCaminhoChange,
  onAbrirArquivo,
}: RepoFileBrowserProps) {
  const [caminhoInterno, setCaminhoInterno] = useState("");
  const caminhoAtual = caminhoExterno ?? caminhoInterno;
  // useCallback pra que o React Compiler preserve a memoização dos callbacks
  // abaixo que dependem de setCaminhoAtual.
  const setCaminhoAtual = useCallback(
    (path: string) => {
      setCaminhoInterno(path);
      onCaminhoChange?.(path);
    },
    [onCaminhoChange],
  );

  const { conteudo, carregando, erro } = useGitHubConteudo(
    owner,
    nome,
    caminhoAtual,
    branch
  );

  const itensOrdenados = useMemo(() => {
    if (!conteudo || !Array.isArray(conteudo)) return [];
    return ordenarConteudo(conteudo);
  }, [conteudo]);

  // Detectar README na pasta atual
  const readmePath = useMemo(() => {
    if (!conteudo || !Array.isArray(conteudo)) return null;
    const readme = conteudo.find((item) =>
      item.type === "file" && /^readme\.(md|mdx|markdown)$/i.test(item.name)
    );
    return readme ? readme.path : null;
  }, [conteudo]);

  const segmentos = useMemo(() => {
    if (!caminhoAtual) return [];
    return caminhoAtual.split("/").filter(Boolean);
  }, [caminhoAtual]);

  const navegarPara = useCallback((path: string) => {
    setCaminhoAtual(path);
  }, [setCaminhoAtual]);

  const handleClick = useCallback(
    (item: GitHubConteudo) => {
      if (item.type === "dir") {
        navegarPara(item.path);
      } else {
        onAbrirArquivo(item.path);
      }
    },
    [navegarPara, onAbrirArquivo]
  );

  const navegarParaSegmento = useCallback(
    (indice: number) => {
      if (indice < 0) {
        setCaminhoAtual("");
        return;
      }
      const novoCaminho = segmentos.slice(0, indice + 1).join("/");
      setCaminhoAtual(novoCaminho);
    },
    [segmentos, setCaminhoAtual]
  );

  return (
    <div
      className="rounded-[8px] border overflow-hidden"
      style={{
        backgroundColor: "var(--tf-surface)",
        borderColor: "var(--tf-border)",
      }}
    >
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-1 px-3 py-2 text-sm border-b overflow-x-auto"
        style={{
          backgroundColor: "var(--tf-bg-secondary)",
          borderColor: "var(--tf-border)",
        }}
      >
        <button
          type="button"
          onClick={() => navegarParaSegmento(-1)}
          className="shrink-0 font-medium px-1 py-0.5 rounded-[4px] transition-colors cursor-pointer hover:underline"
          style={{
            color: segmentos.length > 0 ? "var(--tf-accent)" : "var(--tf-text)",
          }}
        >
          {nome}
        </button>
        {segmentos.map((seg, i) => (
          <span key={i} className="flex items-center gap-1 shrink-0">
            <ChevronRight
              size={14}
              style={{ color: "var(--tf-text-tertiary)" }}
            />
            <button
              type="button"
              onClick={() => navegarParaSegmento(i)}
              className="px-1 py-0.5 rounded-[4px] transition-colors cursor-pointer hover:underline"
              style={{
                color:
                  i < segmentos.length - 1
                    ? "var(--tf-accent)"
                    : "var(--tf-text)",
                fontWeight: i === segmentos.length - 1 ? 500 : 400,
              }}
            >
              {seg}
            </button>
          </span>
        ))}
      </div>

      {/* Conteudo */}
      <div className="p-2">
        {carregando ? (
          <SkeletonLinhas />
        ) : erro ? (
          <div
            className="text-sm text-center py-8"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Erro ao carregar arquivos. Verifique se o repositorio existe e tente
            novamente.
          </div>
        ) : itensOrdenados.length === 0 ? (
          <div
            className="text-sm text-center py-8"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Diretorio vazio
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {itensOrdenados.map((item) => (
              <button
                key={item.sha}
                type="button"
                onClick={() => handleClick(item)}
                className="flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm transition-colors cursor-pointer text-left w-full"
                style={{
                  color: "var(--tf-text)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--tf-surface-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {item.type === "dir" ? (
                  <Folder
                    size={16}
                    className="shrink-0"
                    style={{ color: "var(--tf-accent)" }}
                  />
                ) : (
                  <FileText
                    size={16}
                    className="shrink-0"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  />
                )}
                <span className="truncate flex-1">{item.name}</span>
                {item.type !== "dir" && (
                  <span
                    className="shrink-0 text-xs"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {formatarTamanho(item.size)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* README inline (como o GitHub) */}
      {readmePath && !carregando && (
        <ReadmePreview owner={owner} nome={nome} path={readmePath} branch={branch} />
      )}
    </div>
  );
}

// ─── README Preview (renderizado abaixo do file browser) ───
function ReadmePreview({ owner, nome, path, branch }: { owner: string; nome: string; path: string; branch: string }) {
  const { conteudo, carregando } = useGitHubArquivo(owner, nome, path, branch);
  const nomeArquivo = path.split("/").pop() || "README.md";

  if (carregando) {
    return (
      <div className="border-t p-6" style={{ borderColor: "var(--tf-border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-4 rounded-[4px] animate-pulse" style={{ background: "var(--tf-border)" }} />
          <div className="h-4 w-24 rounded-[4px] animate-pulse" style={{ background: "var(--tf-border)" }} />
        </div>
        <div className="space-y-3">
          {README_SKELETON_LARGURAS.map((largura, i) => (
            <div key={i} className="h-4 rounded-[4px] animate-pulse" style={{ background: "var(--tf-border)", width: `${largura}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!conteudo) return null;

  return (
    <div className="border-t" style={{ borderColor: "var(--tf-border)" }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "var(--tf-border)", background: "var(--tf-bg-secondary)" }}>
        <BookOpen size={14} style={{ color: "var(--tf-text-tertiary)" }} />
        <span className="text-[13px] font-medium" style={{ color: "var(--tf-text-secondary)" }}>{nomeArquivo}</span>
      </div>
      {/* Content */}
      <div style={{ padding: "20px 24px", color: "var(--tf-text)", lineHeight: 1.7 }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            h1: ({ children }) => (
              <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 20, marginBottom: 14, paddingBottom: 6, borderBottom: "1px solid var(--tf-border)", color: "var(--tf-text)" }}>{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 20, marginBottom: 10, paddingBottom: 4, borderBottom: "1px solid var(--tf-border)", color: "var(--tf-text)" }}>{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 6, color: "var(--tf-text)" }}>{children}</h3>
            ),
            p: ({ children }) => (
              <p style={{ marginBottom: 10, fontSize: 14, color: "var(--tf-text-secondary)" }}>{children}</p>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--tf-accent)", textDecoration: "underline" }}>{children}</a>
            ),
            ul: ({ children }) => (
              <ul style={{ marginBottom: 10, paddingLeft: 24, listStyleType: "disc" }}>{children}</ul>
            ),
            ol: ({ children }) => (
              <ol style={{ marginBottom: 10, paddingLeft: 24, listStyleType: "decimal" }}>{children}</ol>
            ),
            li: ({ children }) => (
              <li style={{ marginBottom: 3, fontSize: 14, color: "var(--tf-text-secondary)" }}>{children}</li>
            ),
            blockquote: ({ children }) => (
              <blockquote style={{ borderLeft: "3px solid var(--tf-accent)", paddingLeft: 14, margin: "10px 0", color: "var(--tf-text-tertiary)", fontStyle: "italic" }}>{children}</blockquote>
            ),
            code: ({ className, children }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code style={{ background: "var(--tf-bg-secondary)", padding: "2px 5px", borderRadius: 4, fontSize: 13, fontFamily: "monospace", color: "var(--tf-accent-text)" }}>
                    {children}
                  </code>
                );
              }
              return (
                <code style={{ display: "block", fontFamily: "monospace", fontSize: 13, lineHeight: "20px", color: "var(--tf-text)" }}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre style={{ background: "var(--tf-bg-secondary)", borderRadius: 8, padding: 14, margin: "10px 0", overflow: "auto", border: "1px solid var(--tf-border)" }}>
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <div style={{ overflow: "auto", marginBottom: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead style={{ background: "var(--tf-bg-secondary)" }}>{children}</thead>
            ),
            th: ({ children }) => (
              <th style={{ border: "1px solid var(--tf-border)", padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "var(--tf-text)", fontSize: 13 }}>{children}</th>
            ),
            td: ({ children }) => (
              <td style={{ border: "1px solid var(--tf-border)", padding: "6px 10px", color: "var(--tf-text-secondary)", fontSize: 13 }}>{children}</td>
            ),
            hr: () => (
              <hr style={{ border: "none", borderTop: "1px solid var(--tf-border)", margin: "20px 0" }} />
            ),
            img: ({ src, alt }) => (
              <img src={src} alt={alt || ""} style={{ maxWidth: "100%", borderRadius: 8, margin: "10px 0" }} />
            ),
          }}
        >
          {conteudo}
        </ReactMarkdown>
      </div>
    </div>
  );
}
