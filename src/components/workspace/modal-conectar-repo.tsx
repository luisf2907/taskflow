"use client";

import { useEffect, useState } from "react";
import { GitBranch, Loader2, Lock, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { parsearRepo } from "@/lib/github/client";
import type { Repositorio } from "@/types/github";

interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  owner: string;
  stars: number;
}

interface ModalConectarRepoProps {
  aberto: boolean;
  onFechar: () => void;
  repoInput: string;
  setRepoInput: (v: string) => void;
  repositorios: Repositorio[];
  onConectar: (owner: string, nome: string) => void;
}

export function ModalConectarRepo({
  aberto,
  onFechar,
  repoInput,
  setRepoInput,
  repositorios,
  onConectar,
}: ModalConectarRepoProps) {
  const [ghRepos, setGhRepos] = useState<GhRepo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<"lista" | "manual">("lista");

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    setErro(null);
    fetch("/api/repos")
      .then((res) => res.json())
      .then((data) => {
        if (data.repos) setGhRepos(data.repos);
        else if (data.error) {
          setErro(data.error);
          setModo("manual");
        }
      })
      .catch(() => {
        setErro("Erro ao carregar repositórios");
        setModo("manual");
      })
      .finally(() => setCarregando(false));
  }, [aberto]);

  // Filtrar repos já conectados e pela busca
  const jaConectados = new Set(
    repositorios.map((r) => `${r.owner}/${r.nome}`)
  );
  const filtrados = ghRepos.filter((r) => {
    if (jaConectados.has(r.full_name)) return false;
    if (!repoInput) return true;
    return r.full_name.toLowerCase().includes(repoInput.toLowerCase());
  });

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Conectar repositório"
      className="max-w-md"
    >
      <div className="space-y-3">
        {/* Toggle modo */}
        <div
          className="flex gap-1 p-0.5 rounded-[8px]"
          style={{ background: "var(--tf-bg-secondary)" }}
        >
          <button
            onClick={() => setModo("lista")}
            className="flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-smooth"
            style={{
              background:
                modo === "lista" ? "var(--tf-surface)" : "transparent",
              color:
                modo === "lista" ? "var(--tf-text)" : "var(--tf-text-tertiary)",
              boxShadow:
                modo === "lista" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Meus Repos
          </button>
          <button
            onClick={() => setModo("manual")}
            className="flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-smooth"
            style={{
              background:
                modo === "manual" ? "var(--tf-surface)" : "transparent",
              color:
                modo === "manual"
                  ? "var(--tf-text)"
                  : "var(--tf-text-tertiary)",
              boxShadow:
                modo === "manual" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Manual
          </button>
        </div>

        {modo === "lista" ? (
          <>
            {/* Busca */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--tf-text-tertiary)" }}
              />
              <input
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="Buscar repositório..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-[8px] outline-none transition-smooth"
                style={{
                  background: "var(--tf-bg-secondary)",
                  border: "1px solid var(--tf-border)",
                  color: "var(--tf-text)",
                }}
              />
            </div>

            {/* Lista */}
            <div
              className="max-h-[320px] overflow-y-auto space-y-1 -mx-1 px-1"
              style={{ scrollbarWidth: "thin" }}
            >
              {carregando ? (
                <div
                  className="flex items-center justify-center py-8 gap-2"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">Carregando repositórios...</span>
                </div>
              ) : erro ? (
                <div className="text-center py-6">
                  <p
                    className="text-xs"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {erro}
                  </p>
                </div>
              ) : filtrados.length === 0 ? (
                <div className="text-center py-6">
                  <p
                    className="text-xs"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {repoInput
                      ? "Nenhum repo encontrado"
                      : "Todos os repos já foram conectados"}
                  </p>
                </div>
              ) : (
                filtrados.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onConectar(r.owner, r.name)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-[8px] text-left transition-smooth group"
                    style={{ border: "1px solid transparent" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "var(--tf-bg-secondary)";
                      e.currentTarget.style.borderColor = "var(--tf-border)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                      style={{ background: "var(--tf-accent-light)" }}
                    >
                      <GitBranch
                        size={14}
                        style={{ color: "var(--tf-accent)" }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--tf-text)" }}
                        >
                          {r.full_name}
                        </span>
                        {r.private && (
                          <Lock
                            size={11}
                            style={{ color: "var(--tf-text-tertiary)" }}
                          />
                        )}
                      </div>
                      {r.description && (
                        <p
                          className="text-[11px] truncate mt-0.5"
                          style={{ color: "var(--tf-text-tertiary)" }}
                        >
                          {r.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {r.language && (
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: "var(--tf-text-tertiary)" }}
                          >
                            {r.language}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-[8px] opacity-0 group-hover:opacity-100 transition-smooth"
                      style={{ background: "var(--tf-accent)", color: "#fff" }}
                    >
                      Conectar
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          /* Modo manual — input de URL */
          <>
            <div>
              <label
                className="text-[12px] font-semibold mb-1.5 block"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                URL ou owner/repo
              </label>
              <input
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="https://github.com/owner/repo ou owner/repo"
                className="w-full px-3 py-2 text-sm rounded-[8px] outline-none transition-smooth"
                style={{
                  background: "var(--tf-bg-secondary)",
                  border: "2px solid var(--tf-border)",
                  color: "var(--tf-text)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const parsed = parsearRepo(repoInput);
                    if (parsed) onConectar(parsed.owner, parsed.nome);
                  }
                }}
              />
              <p
                className="text-[11px] mt-1"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Cole a URL do GitHub ou digite owner/repo
              </p>
            </div>

            {repoInput && parsearRepo(repoInput) && (
              <div
                className="p-3 rounded-[8px] border"
                style={{
                  background: "var(--tf-bg-secondary)",
                  borderColor: "var(--tf-border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <GitBranch size={16} style={{ color: "var(--tf-accent)" }} />
                  <span
                    className="text-sm font-bold"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {parsearRepo(repoInput)!.owner}/
                    {parsearRepo(repoInput)!.nome}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                const parsed = parsearRepo(repoInput);
                if (parsed) onConectar(parsed.owner, parsed.nome);
              }}
              disabled={!repoInput || !parsearRepo(repoInput)}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-[8px] transition-smooth disabled:opacity-40"
              style={{ background: "var(--tf-accent)" }}
            >
              Conectar
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
