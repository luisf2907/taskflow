"use client";

import { GitBranch, Trash2 } from "lucide-react";
import { useGitHubRepo } from "@/hooks/use-github";

interface RepoCardProps {
  owner: string;
  nome: string;
  onAbrir: () => void;
  onDesconectar: () => void;
}

export function RepoCard({ owner, nome, onAbrir, onDesconectar }: RepoCardProps) {
  const { repo, carregando } = useGitHubRepo(owner, nome);

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-[var(--tf-radius-md)] border transition-smooth cursor-pointer group"
      style={{
        background: "var(--tf-surface)",
        borderColor: "var(--tf-border)",
      }}
      onClick={onAbrir}
    >
      <div
        className="w-10 h-10 rounded-[var(--tf-radius-xs)] flex items-center justify-center shrink-0"
        style={{ background: "var(--tf-accent-light)" }}
      >
        <GitBranch size={20} style={{ color: "var(--tf-accent-text)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-bold truncate"
          style={{ color: "var(--tf-text)" }}
        >
          {owner}/{nome}
        </p>
        {carregando ? (
          <div
            className="h-3 w-48 rounded mt-1 animate-pulse"
            style={{ background: "var(--tf-border)" }}
          />
        ) : repo ? (
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            {repo.description || "Sem descrição"}
            {repo.language && (
              <span
                className="ml-2 font-medium"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                {repo.language}
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs mt-0.5" style={{ color: "var(--tf-danger)" }}>
            Repositório não encontrado
          </p>
        )}
      </div>
      {repo && (
        <div
          className="flex items-center gap-3 text-xs shrink-0"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          <span>&#9733; {repo.stargazers_count}</span>
          <span>&#8918; {repo.forks_count}</span>
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDesconectar();
        }}
        className="p-1.5 rounded-[var(--tf-radius-xs)] opacity-0 group-hover:opacity-100 transition-smooth"
        style={{ color: "var(--tf-danger)" }}
        title="Desconectar"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
