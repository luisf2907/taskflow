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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* Campo de busca */}
      <div
        style={{
          position: "relative",
        }}
      >
        <Search
          size={16}
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--tf-text-tertiary)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          placeholder="Filtrar branches..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px 8px 34px",
            borderRadius: "6px",
            border: "1px solid var(--tf-border)",
            backgroundColor: "var(--tf-bg-secondary)",
            color: "var(--tf-text)",
            fontSize: "13px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Lista de branches */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {carregando ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                borderRadius: "6px",
                backgroundColor: "var(--tf-bg-secondary)",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  backgroundColor: "var(--tf-border)",
                  opacity: 0.5,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    width: `${100 + i * 20}px`,
                    height: "14px",
                    borderRadius: "4px",
                    backgroundColor: "var(--tf-border)",
                    opacity: 0.5,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    width: "56px",
                    height: "12px",
                    borderRadius: "4px",
                    backgroundColor: "var(--tf-border)",
                    opacity: 0.3,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          ))
        ) : branchesFiltradas.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              textAlign: "center",
              color: "var(--tf-text-tertiary)",
              fontSize: "13px",
            }}
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  backgroundColor: isAtiva
                    ? "color-mix(in srgb, var(--tf-accent) 12%, transparent)"
                    : "transparent",
                  transition: "background-color 150ms ease",
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
                  style={{
                    color: isAtiva
                      ? "var(--tf-accent)"
                      : "var(--tf-text-tertiary)",
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: isDefault ? 600 : 400,
                        color: isAtiva
                          ? "var(--tf-accent)"
                          : "var(--tf-text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {branch.name}
                    </span>

                    {isDefault && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 500,
                          padding: "1px 6px",
                          borderRadius: "9999px",
                          backgroundColor:
                            "color-mix(in srgb, var(--tf-success) 15%, transparent)",
                          color: "var(--tf-success)",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        padrão
                      </span>
                    )}

                    {branch.protected && (
                      <Shield
                        size={12}
                        style={{
                          color: "var(--tf-text-tertiary)",
                          flexShrink: 0,
                        }}
                        aria-label="Branch protegida"
                      />
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "var(--tf-text-tertiary)",
                    }}
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
