"use client";

import { useMemo } from "react";
import { ArrowLeft, ExternalLink, FileCode, FileText, FileWarning, Download } from "lucide-react";
import { useGitHubArquivo } from "@/hooks/use-github";
import { extensaoParaLinguagem, ehBinario } from "@/lib/github/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        style={{
          backgroundColor: "var(--tf-surface)",
          borderRadius: 8,
          border: "1px solid var(--tf-border)",
          overflow: "hidden",
        }}
      >
        {/* Header skeleton */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--tf-border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: "var(--tf-bg-secondary)",
            }}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                width: "40%",
                height: 14,
                borderRadius: 4,
                backgroundColor: "var(--tf-bg-secondary)",
              }}
            />
            <div
              style={{
                width: "20%",
                height: 12,
                borderRadius: 4,
                backgroundColor: "var(--tf-bg-secondary)",
              }}
            />
          </div>
        </div>
        {/* Content skeleton */}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 14,
                borderRadius: 4,
                backgroundColor: "var(--tf-bg-secondary)",
                width: `${Math.max(30, Math.random() * 90)}%`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "var(--tf-surface)",
        borderRadius: 8,
        border: "1px solid var(--tf-border)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--tf-border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onVoltar}
          title="Voltar"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 6,
            border: "1px solid var(--tf-border)",
            backgroundColor: "var(--tf-bg-secondary)",
            color: "var(--tf-text-secondary)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
        </button>

        {ehMarkdown ? (
          <FileText size={16} style={{ color: "var(--tf-text-tertiary)", flexShrink: 0 }} />
        ) : (
          <FileCode size={16} style={{ color: "var(--tf-text-tertiary)", flexShrink: 0 }} />
        )}

        {/* Breadcrumb */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexWrap: "wrap",
            fontFamily: "monospace",
            fontSize: 13,
            minWidth: 0,
          }}
        >
          <span style={{ color: "var(--tf-text-secondary)" }}>{nome}</span>
          {segmentos.map((seg, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--tf-text-tertiary)" }}>/</span>
              <span
                style={{
                  color: i === segmentos.length - 1 ? "var(--tf-text)" : "var(--tf-text-secondary)",
                  fontWeight: i === segmentos.length - 1 ? 600 : 400,
                }}
              >
                {seg}
              </span>
            </span>
          ))}
        </div>

        {/* Meta + Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {tamanhoFormatado && (
            <span
              style={{
                fontSize: 12,
                color: "var(--tf-text-tertiary)",
                whiteSpace: "nowrap",
              }}
            >
              {tamanhoFormatado}
            </span>
          )}

          {!binario && linhas.length > 0 && (
            <span
              style={{
                fontSize: 12,
                color: "var(--tf-text-tertiary)",
                whiteSpace: "nowrap",
              }}
            >
              {linhas.length} {linhas.length === 1 ? "linha" : "linhas"}
            </span>
          )}

          <a
            href={urlRaw}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: "var(--tf-accent)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Raw
          </a>

          <a
            href={urlGitHub}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no GitHub"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              color: "var(--tf-accent)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <ExternalLink size={13} />
            Abrir no GitHub
          </a>
        </div>
      </div>

      {/* Content */}
      {ehMarkdown && conteudo ? (
        <div className="markdown-body" style={{ padding: "24px 32px", color: "var(--tf-text)", lineHeight: 1.7 }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 24, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--tf-border)", color: "var(--tf-text)" }}>{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ fontSize: 22, fontWeight: 600, marginTop: 24, marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid var(--tf-border)", color: "var(--tf-text)" }}>{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 20, marginBottom: 8, color: "var(--tf-text)" }}>{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 style={{ fontSize: 16, fontWeight: 600, marginTop: 16, marginBottom: 6, color: "var(--tf-text)" }}>{children}</h4>
              ),
              p: ({ children }) => (
                <p style={{ marginBottom: 12, fontSize: 14, color: "var(--tf-text-secondary)" }}>{children}</p>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--tf-accent)", textDecoration: "underline" }}>{children}</a>
              ),
              ul: ({ children }) => (
                <ul style={{ marginBottom: 12, paddingLeft: 24, listStyleType: "disc" }}>{children}</ul>
              ),
              ol: ({ children }) => (
                <ol style={{ marginBottom: 12, paddingLeft: 24, listStyleType: "decimal" }}>{children}</ol>
              ),
              li: ({ children }) => (
                <li style={{ marginBottom: 4, fontSize: 14, color: "var(--tf-text-secondary)" }}>{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote style={{ borderLeft: "3px solid var(--tf-accent)", paddingLeft: 16, margin: "12px 0", color: "var(--tf-text-tertiary)", fontStyle: "italic" }}>{children}</blockquote>
              ),
              code: ({ className, children }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code style={{ background: "var(--tf-bg-secondary)", padding: "2px 6px", borderRadius: 4, fontSize: 13, fontFamily: "monospace", color: "var(--tf-accent-text)" }}>
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
                <pre style={{ background: "var(--tf-bg-secondary)", borderRadius: 8, padding: 16, margin: "12px 0", overflow: "auto", border: "1px solid var(--tf-border)" }}>
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div style={{ overflow: "auto", marginBottom: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead style={{ background: "var(--tf-bg-secondary)" }}>{children}</thead>
              ),
              th: ({ children }) => (
                <th style={{ border: "1px solid var(--tf-border)", padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--tf-text)", fontSize: 13 }}>{children}</th>
              ),
              td: ({ children }) => (
                <td style={{ border: "1px solid var(--tf-border)", padding: "8px 12px", color: "var(--tf-text-secondary)", fontSize: 13 }}>{children}</td>
              ),
              hr: () => (
                <hr style={{ border: "none", borderTop: "1px solid var(--tf-border)", margin: "24px 0" }} />
              ),
              img: ({ src, alt }) => (
                <img src={src} alt={alt || ""} style={{ maxWidth: "100%", borderRadius: 8, margin: "12px 0" }} />
              ),
              input: ({ type, checked, ...props }) => {
                if (type === "checkbox") {
                  return (
                    <input type="checkbox" checked={checked} readOnly style={{ marginRight: 8, accentColor: "var(--tf-accent)" }} />
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
          style={{
            padding: "48px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            color: "var(--tf-text-secondary)",
          }}
        >
          <FileWarning size={40} style={{ color: "var(--tf-text-tertiary)" }} />
          <span style={{ fontSize: 14 }}>
            Arquivo bin&aacute;rio &mdash; n&atilde;o &eacute; poss&iacute;vel visualizar
          </span>
          <a
            href={urlRaw}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--tf-accent)",
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--tf-border)",
              backgroundColor: "var(--tf-bg-secondary)",
            }}
          >
            <Download size={14} />
            Baixar arquivo
          </a>
        </div>
      ) : (
        <div style={{ overflow: "auto" }}>
          <pre
            style={{
              margin: 0,
              padding: 0,
              fontFamily: "monospace",
              fontSize: 13,
              lineHeight: "20px",
              backgroundColor: "var(--tf-bg)",
            }}
          >
            <code className={`language-${linguagem}`} style={{ display: "table", width: "100%" }}>
              {linhas.map((linha, i) => (
                <div
                  key={i}
                  style={{
                    display: "table-row",
                  }}
                >
                  <span
                    style={{
                      display: "table-cell",
                      textAlign: "right",
                      paddingLeft: 16,
                      paddingRight: 16,
                      userSelect: "none",
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "monospace",
                      fontSize: 12,
                      lineHeight: "20px",
                      borderRight: "1px solid var(--tf-border)",
                      whiteSpace: "nowrap",
                      verticalAlign: "top",
                      minWidth: 48,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      display: "table-cell",
                      paddingLeft: 16,
                      paddingRight: 16,
                      whiteSpace: "pre",
                      color: "var(--tf-text)",
                      fontFamily: "monospace",
                      lineHeight: "20px",
                    }}
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
