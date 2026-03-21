"use client";

import { Modal } from "@/components/ui/modal";
import { GitPullRequest, Loader2, ChevronDown, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import type { GitHubBranch } from "@/types/github";

interface CriarPRProps {
  aberto: boolean;
  onFechar: () => void;
  repoId: string;
  owner: string;
  nome: string;
}

export function CriarPR({ aberto, onFechar, repoId, owner, nome }: CriarPRProps) {
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [carregandoBranches, setCarregandoBranches] = useState(false);
  const [head, setHead] = useState("");
  const [base, setBase] = useState("main");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{ number: number; html_url: string } | null>(null);

  // Buscar branches quando abre o modal
  useEffect(() => {
    if (!aberto) {
      // Reset ao fechar
      setHead("");
      setBase("main");
      setTitulo("");
      setDescricao("");
      setErro(null);
      setSucesso(null);
      return;
    }

    setCarregandoBranches(true);
    fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo: nome }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.branches) {
          setBranches(data.branches);
          // Achar default branch (main ou master)
          const def = data.branches.find((b: GitHubBranch) => b.name === "main")
            || data.branches.find((b: GitHubBranch) => b.name === "master");
          if (def) setBase(def.name);
        }
        if (data.error) setErro(data.error);
      })
      .catch(() => setErro("Erro ao carregar branches"))
      .finally(() => setCarregandoBranches(false));
  }, [aberto, owner, nome]);

  async function handleCriar() {
    if (!head || !base || !titulo.trim()) return;
    if (head === base) {
      setErro("Branch de origem e destino não podem ser iguais");
      return;
    }

    setCriando(true);
    setErro(null);

    try {
      const res = await fetch("/api/pr-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId,
          title: titulo.trim(),
          head,
          base,
          body: descricao.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao criar PR");
        return;
      }

      setSucesso(data.pr);
    } catch {
      setErro("Erro de conexão");
    } finally {
      setCriando(false);
    }
  }

  const branchesDisponiveis = branches.filter((b) => b.name !== base);

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Criar Pull Request">
      {sucesso ? (
        <div className="text-center py-4 space-y-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "var(--tf-success, #22c55e)20" }}
          >
            <GitPullRequest size={28} style={{ color: "var(--tf-success, #22c55e)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--tf-text)" }}>
              PR #{sucesso.number} criado com sucesso!
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--tf-text-secondary)" }}>
              Um card foi criado automaticamente na coluna Review.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <a
              href={sucesso.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white"
              style={{ background: "var(--tf-accent)" }}
            >
              <ExternalLink size={13} /> Ver no GitHub
            </a>
            <button
              onClick={onFechar}
              className="px-4 py-2 text-xs font-semibold rounded-lg"
              style={{ color: "var(--tf-text-secondary)", border: "1px solid var(--tf-border)" }}
            >
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Repo info */}
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--tf-text-tertiary)" }}>
            <GitPullRequest size={14} />
            <span className="font-medium">{owner}/{nome}</span>
          </div>

          {/* Branch de origem (head) */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
              Branch de origem
            </label>
            {carregandoBranches ? (
              <div className="flex items-center gap-2 text-xs py-2" style={{ color: "var(--tf-text-tertiary)" }}>
                <Loader2 size={14} className="animate-spin" /> Carregando branches...
              </div>
            ) : (
              <div className="relative">
                <select
                  value={head}
                  onChange={(e) => setHead(e.target.value)}
                  className="w-full appearance-none text-sm px-3 py-2 rounded-lg border pr-8"
                  style={{
                    background: "var(--tf-bg)",
                    borderColor: "var(--tf-border)",
                    color: head ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                  }}
                >
                  <option value="">Selecione a branch...</option>
                  {branchesDisponiveis.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--tf-text-tertiary)" }}
                />
              </div>
            )}
          </div>

          {/* Branch destino (base) */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
              Branch destino
            </label>
            <div className="relative">
              <select
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="w-full appearance-none text-sm px-3 py-2 rounded-lg border pr-8"
                style={{
                  background: "var(--tf-bg)",
                  borderColor: "var(--tf-border)",
                  color: "var(--tf-text)",
                }}
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--tf-text-tertiary)" }}
              />
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
              Título do PR
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: feat: adicionar autenticação OAuth"
              className="w-full text-sm px-3 py-2 rounded-lg border"
              style={{
                background: "var(--tf-bg)",
                borderColor: "var(--tf-border)",
                color: "var(--tf-text)",
              }}
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--tf-text-secondary)" }}>
              Descrição <span style={{ color: "var(--tf-text-tertiary)" }}>(opcional)</span>
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva as mudanças..."
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border resize-none"
              style={{
                background: "var(--tf-bg)",
                borderColor: "var(--tf-border)",
                color: "var(--tf-text)",
              }}
            />
          </div>

          {/* Erro */}
          {erro && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "#ef444420", color: "#ef4444" }}
            >
              {erro}
            </div>
          )}

          {/* Botão criar */}
          <button
            onClick={handleCriar}
            disabled={criando || !head || !titulo.trim() || carregandoBranches}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--tf-accent)" }}
          >
            {criando ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Criando...
              </>
            ) : (
              <>
                <GitPullRequest size={15} /> Criar Pull Request
              </>
            )}
          </button>
        </div>
      )}
    </Modal>
  );
}
