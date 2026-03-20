"use client";

import { useMemo } from "react";
import { ArrowLeft, ExternalLink, FileCode, FileWarning, Download } from "lucide-react";
import { useGitHubArquivo } from "@/hooks/use-github";
import { extensaoParaLinguagem, ehBinario } from "@/lib/github/client";

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

        <FileCode size={16} style={{ color: "var(--tf-text-tertiary)", flexShrink: 0 }} />

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
      {binario ? (
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
