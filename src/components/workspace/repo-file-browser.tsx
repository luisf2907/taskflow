"use client";

import { useGitHubConteudo } from "@/hooks/use-github";
import type { GitHubConteudo } from "@/types/github";
import { ChevronRight, FileText, Folder } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface RepoFileBrowserProps {
  owner: string;
  nome: string;
  branch: string;
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

function SkeletonLinhas() {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md px-3 py-2 animate-pulse"
          style={{ backgroundColor: "var(--tf-bg-secondary)" }}
        >
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: "var(--tf-border)" }}
          />
          <div
            className="h-4 rounded flex-1"
            style={{
              backgroundColor: "var(--tf-border)",
              maxWidth: `${120 + Math.random() * 160}px`,
            }}
          />
          <div
            className="h-4 w-12 rounded ml-auto"
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
  onAbrirArquivo,
}: RepoFileBrowserProps) {
  const [caminhoAtual, setCaminhoAtual] = useState("");

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

  const segmentos = useMemo(() => {
    if (!caminhoAtual) return [];
    return caminhoAtual.split("/").filter(Boolean);
  }, [caminhoAtual]);

  const navegarPara = useCallback((path: string) => {
    setCaminhoAtual(path);
  }, []);

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
    [segmentos]
  );

  return (
    <div
      className="rounded-lg border overflow-hidden"
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
          className="shrink-0 font-medium px-1 py-0.5 rounded transition-colors cursor-pointer hover:underline"
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
              className="px-1 py-0.5 rounded transition-colors cursor-pointer hover:underline"
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
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer text-left w-full"
                style={{
                  color: "var(--tf-text)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--tf-hover)";
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
    </div>
  );
}
