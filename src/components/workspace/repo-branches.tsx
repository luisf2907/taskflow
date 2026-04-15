"use client";

import { useState } from "react";
import { GitBranch, Search, Shield } from "lucide-react";
import { useGitHubBranches } from "@/hooks/use-github";

interface RepoBranchesProps {
  owner: string;
  nome: string;
  defaultBranch: string;
  branchAtiva: string;
  onTrocarBranch: (branch: string) => void;
}

export function RepoBranches({
  owner,
  nome,
  defaultBranch,
  branchAtiva,
  onTrocarBranch,
}: RepoBranchesProps) {
  const { branches, carregando } = useGitHubBranches(owner, nome);
  const [busca, setBusca] = useState("");

  const branchesFiltradas = branches.filter((b) =>
    b.name.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Campo de busca */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--tf-text-tertiary)" }}
        />
        <input
          type="text"
          placeholder="Filtrar branches..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full py-2 pr-3 pl-[34px] text-[13px] rounded-[var(--tf-radius-xs)] outline-none"
          style={{
            background: "var(--tf-bg-secondary)",
            border: "1px solid var(--tf-border)",
            color: "var(--tf-text)",
          }}
        />
      </div>

      {/* Lista de branches */}
      <div className="flex flex-col gap-[2px]">
        {carregando ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-[10px] px-3 py-[10px] rounded-[var(--tf-radius-xs)]"
              style={{ backgroundColor: "var(--tf-bg-secondary)" }}
            >
              <div
                className="w-4 h-4 rounded-[4px] opacity-50 animate-pulse"
                style={{ backgroundColor: "var(--tf-border)" }}
              />
              <div className="flex-1 flex flex-col gap-1">
                <div
                  className="h-[14px] rounded-[4px] opacity-50 animate-pulse"
                  style={{
                    width: `${100 + i * 20}px`,
                    backgroundColor: "var(--tf-border)",
                  }}
                />
                <div
                  className="w-14 h-3 rounded-[4px] opacity-30 animate-pulse"
                  style={{ backgroundColor: "var(--tf-border)" }}
                />
              </div>
            </div>
          ))
        ) : branchesFiltradas.length === 0 ? (
          <div
            className="px-3 py-6 text-center text-[13px]"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            {busca
              ? "Nenhuma branch encontrada para esta busca."
              : "Nenhuma branch encontrada."}
          </div>
        ) : (
          branchesFiltradas.map((branch) => {
            const isAtiva = branch.name === branchAtiva;
            const isDefault = branch.name === defaultBranch;

            return (
              <button
                key={branch.name}
                onClick={() => onTrocarBranch(branch.name)}
                className="flex items-center gap-[10px] px-3 py-[10px] rounded-[var(--tf-radius-xs)] border-none cursor-pointer text-left w-full transition-all duration-150"
                style={{
                  backgroundColor: isAtiva
                    ? "color-mix(in srgb, var(--tf-accent) 12%, transparent)"
                    : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isAtiva) {
                    e.currentTarget.style.backgroundColor =
                      "var(--tf-bg-secondary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAtiva) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <GitBranch
                  size={16}
                  className="shrink-0"
                  style={{
                    color: isAtiva
                      ? "var(--tf-accent)"
                      : "var(--tf-text-tertiary)",
                  }}
                />

                <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
                  <div className="flex items-center gap-[6px]">
                    <span
                      className={`text-[13px] overflow-hidden text-ellipsis whitespace-nowrap ${isDefault ? "font-semibold" : "font-normal"}`}
                      style={{
                        color: isAtiva
                          ? "var(--tf-accent)"
                          : "var(--tf-text)",
                      }}
                    >
                      {branch.name}
                    </span>

                    {isDefault && (
                      <span
                        className="text-[10px] font-medium px-[6px] py-[1px] rounded-full whitespace-nowrap shrink-0"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--tf-success) 15%, transparent)",
                          color: "var(--tf-success)",
                        }}
                      >
                        padrão
                      </span>
                    )}

                    {branch.protected && (
                      <Shield
                        size={12}
                        className="shrink-0"
                        style={{ color: "var(--tf-text-tertiary)" }}
                        aria-label="Branch protegida"
                      />
                    )}
                  </div>

                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {branch.commit.sha.slice(0, 7)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
