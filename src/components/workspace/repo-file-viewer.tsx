"use client";

import { useMemo } from "react";
import { ArrowLeft, ExternalLink, FileCode, FileText, FileWarning, Download } from "lucide-react";
import { useGitHubArquivo } from "@/hooks/use-github";
import { extensaoParaLinguagem, ehBinario } from "@/lib/github/client";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

// Larguras pre-computadas pro skeleton (evita Math.random() no render).
const SKELETON_LARGURAS = Array.from({ length: 12 }, () => Math.max(30, Math.random() * 90));

interface RepoFileViewerProps {
  owner: string;
  nome: string;
  path: string;
  branch: string;
  onVoltar: () => void;
}

export function RepoFileViewer({ owner, nome, path, branch, onVoltar }: RepoFileViewerProps) {
  const { conteudo, carregando } = useGitHubArquivo(owner, nome, path, branch);
  const nomeArquivo = path.split("/").pop() || path;
  const linguagem = extensaoParaLinguagem(nomeArquivo);
  const binario = ehBinario(nomeArquivo);
  const ehMarkdown = /\.(md|mdx|markdown)$/i.test(nomeArquivo);

  const segmentos = useMemo(() => path.split("/").filter(Boolean), [path]);

  const linhas = useMemo(() => {
    if (!conteudo) return [];
    return conteudo.split("\n");
  }, [conteudo]);

  const tamanhoFormatado = useMemo(() => {
    if (!conteudo) return "";
    const bytes = new Blob([conteudo]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [conteudo]);

  const urlRaw = `https://raw.githubusercontent.com/${owner}/${nome}/${branch}/${path}`;
  const urlGitHub = `https://github.com/${owner}/${nome}/blob/${branch}/${path}`;

  if (carregando) {
    return (
      <div
        className="rounded-[var(--tf-radius-xs)] overflow-hidden"
        style={{ backgroundColor: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
      >
        {/* Header skeleton */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ borderBottom: "1px solid var(--tf-border)" }}
        >
          <div
            className="w-7 h-7 rounded-[var(--tf-radius-xs)] animate-pulse"
            style={{ backgroundColor: "var(--tf-bg-secondary)" }}
          />
          <div className="flex-1 flex flex-col gap-1.5">
            <div
              className="w-[40%] h-3.5 rounded-[4px] animate-pulse"
              style={{ backgroundColor: "var(--tf-bg-secondary)" }}
            />
            <div
              className="w-[20%] h-3 rounded-[4px] animate-pulse"
              style={{ backgroundColor: "var(--tf-bg-secondary)" }}
            />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="p-4 flex flex-col gap-2">
          {SKELETON_LARGURAS.map((largura, i) => (
            <div
              key={i}
              className="h-3.5 rounded-[4px] animate-pulse opacity-60"
              style={{
                backgroundColor: "var(--tf-bg-secondary)",
                width: `${largura}%`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--tf-radius-xs)] overflow-hidden"
      style={{ backgroundColor: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2.5 flex-wrap"
        style={{ borderBottom: "1px solid var(--tf-border)" }}
      >
        <button
          onClick={onVoltar}
          title="Voltar"
          className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[var(--tf-radius-xs)] cursor-pointer shrink-0"
          style={{
            border: "1px solid var(--tf-border)",
            backgroundColor: "var(--tf-bg-secondary)",
            color: "var(--tf-text-secondary)",
          }}
        >
          <ArrowLeft size={16} />
        </button>

        {ehMarkdown ? (
          <FileText size={16} className="shrink-0" style={{ color: "var(--tf-text-tertiary)" }} />
        ) : (
          <FileCode size={16} className="shrink-0" style={{ color: "var(--tf-text-tertiary)" }} />
        )}

        {/* Breadcrumb */}
        <div className="flex-1 flex items-center gap-1 flex-wrap font-mono text-[13px] min-w-0">
          <span style={{ color: "var(--tf-text-secondary)" }}>{nome}</span>
          {segmentos.map((seg, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span style={{ color: "var(--tf-text-tertiary)" }}>/</span>
              <span
                className={i === segmentos.length - 1 ? "font-semibold" : "font-normal"}
                style={{
                  color: i === segmentos.length - 1 ? "var(--tf-text)" : "var(--tf-text-secondary)",
                }}
              >
                {seg}
              </span>
            </span>
          ))}
        </div>

        {/* Meta + Links */}
        <div className="flex items-center gap-2 shrink-0">
          {tamanhoFormatado && (
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--tf-text-tertiary)" }}>
              {tamanhoFormatado}
            </span>
          )}

          {!binario && linhas.length > 0 && (
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--tf-text-tertiary)" }}>
              {linhas.length} {linhas.length === 1 ? "linha" : "linhas"}
            </span>
          )}

          <a
            href={urlRaw}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs no-underline whitespace-nowrap"
            style={{ color: "var(--tf-accent)" }}
          >
            Raw
          </a>

          <a
            href={urlGitHub}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no GitHub"
            className="inline-flex items-center gap-1 text-xs no-underline whitespace-nowrap"
            style={{ color: "var(--tf-accent)" }}
          >
            <ExternalLink size={13} />
            Abrir no GitHub
          </a>
        </div>
      </div>

      {/* Content */}
      {ehMarkdown && conteudo ? (
        <div className="markdown-body px-8 py-6 leading-[1.7]" style={{ color: "var(--tf-text)" }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              h1: ({ children }) => (
                <h1
                  className="text-[28px] font-bold mt-6 mb-4 pb-2"
                  style={{ borderBottom: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
                >
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2
                  className="text-[22px] font-semibold mt-6 mb-3 pb-1.5"
                  style={{ borderBottom: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold mt-5 mb-2" style={{ color: "var(--tf-text)" }}>
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-base font-semibold mt-4 mb-1.5" style={{ color: "var(--tf-text)" }}>
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="mb-3 text-sm" style={{ color: "var(--tf-text-secondary)" }}>
                  {children}
                </p>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--tf-accent)" }}>
                  {children}
                </a>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 pl-6 list-disc">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 pl-6 list-decimal">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="mb-1 text-sm" style={{ color: "var(--tf-text-secondary)" }}>
                  {children}
                </li>
              ),
              blockquote: ({ children }) => (
                <blockquote
                  className="pl-4 my-3 italic"
                  style={{ borderLeft: "3px solid var(--tf-accent)", color: "var(--tf-text-tertiary)" }}
                >
                  {children}
                </blockquote>
              ),
              code: ({ className, children }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded-[4px] text-[13px] font-mono"
                      style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-accent-text)" }}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="block font-mono text-[13px] leading-5" style={{ color: "var(--tf-text)" }}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre
                  className="rounded-[var(--tf-radius-xs)] p-4 my-3 overflow-auto"
                  style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)" }}
                >
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div className="overflow-auto mb-3">
                  <table className="w-full border-collapse text-[13px]">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead style={{ background: "var(--tf-bg-secondary)" }}>{children}</thead>
              ),
              th: ({ children }) => (
                <th
                  className="px-3 py-2 text-left font-semibold text-[13px]"
                  style={{ border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td
                  className="px-3 py-2 text-[13px]"
                  style={{ border: "1px solid var(--tf-border)", color: "var(--tf-text-secondary)" }}
                >
                  {children}
                </td>
              ),
              hr: () => (
                <hr className="my-6 border-none" style={{ borderTop: "1px solid var(--tf-border)" }} />
              ),
              img: ({ src, alt }) => (
                <img src={src} alt={alt || ""} className="max-w-full rounded-[var(--tf-radius-xs)] my-3" />
              ),
              input: ({ type, checked, ...props }) => {
                if (type === "checkbox") {
                  return (
                    <input type="checkbox" checked={checked} readOnly className="mr-2" style={{ accentColor: "var(--tf-accent)" }} />
                  );
                }
                return <input type={type} {...props} />;
              },
            }}
          >
            {conteudo}
          </ReactMarkdown>
        </div>
      ) : binario ? (
        <div
          className="px-4 py-12 flex flex-col items-center gap-3"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          <FileWarning size={40} style={{ color: "var(--tf-text-tertiary)" }} />
          <span className="text-sm">
            Arquivo bin&aacute;rio &mdash; n&atilde;o &eacute; poss&iacute;vel visualizar
          </span>
          <a
            href={urlRaw}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] no-underline px-3.5 py-1.5 rounded-[var(--tf-radius-xs)]"
            style={{
              color: "var(--tf-accent)",
              border: "1px solid var(--tf-border)",
              backgroundColor: "var(--tf-bg-secondary)",
            }}
          >
            <Download size={14} />
            Baixar arquivo
          </a>
        </div>
      ) : (
        <div className="overflow-auto">
          <pre className="m-0 p-0 font-mono text-[13px] leading-5" style={{ backgroundColor: "var(--tf-bg)" }}>
            <code className={`language-${linguagem} table w-full`}>
              {linhas.map((linha, i) => (
                <div key={i} className="table-row">
                  <span
                    className="table-cell text-right px-4 select-none font-mono text-xs leading-5 whitespace-nowrap align-top min-w-[48px]"
                    style={{ color: "var(--tf-text-tertiary)", borderRight: "1px solid var(--tf-border)" }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="table-cell px-4 whitespace-pre font-mono leading-5"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {linha}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}
