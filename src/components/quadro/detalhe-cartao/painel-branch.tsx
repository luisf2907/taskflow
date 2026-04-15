"use client";

import { useEffect, useState } from "react";
import { ExternalLink, GitBranch, Loader2 } from "lucide-react";
import { CartaoComResumo } from "@/hooks/use-cartoes";

interface PainelBranchProps {
  cartao: CartaoComResumo;
  onAtualizar: (campos: Record<string, unknown>) => void;
}

export function PainelBranch({ cartao, onAtualizar }: PainelBranchProps) {
  const [repos, setRepos] = useState<
    { id: string; owner: string; nome: string }[]
  >([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [repoSelecionado, setRepoSelecionado] = useState<string | null>(
    cartao.branch_repo_id || null
  );
  const [modo, setModo] = useState<"selecionar" | "manual">(
    cartao.branch ? "manual" : "selecionar"
  );
  const [inputManual, setInputManual] = useState(cartao.branch || "");

  useEffect(() => {
    if (!cartao.workspace_id) return;
    (async () => {
      const { supabase } = await import("@/lib/supabase/client");
      const { data } = await supabase
        .from("repositorios")
        .select("id, owner, nome")
        .eq("workspace_id", cartao.workspace_id);
      if (data && data.length > 0) {
        setRepos(data);
        if (!repoSelecionado && data.length === 1) {
          setRepoSelecionado(data[0].id);
        }
      }
    })();
  }, [cartao.workspace_id, repoSelecionado]);

  useEffect(() => {
    if (!repoSelecionado || modo === "manual") return;
    const repo = repos.find((r) => r.id === repoSelecionado);
    if (!repo) return;

    setCarregando(true);
    fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: repo.owner, repo: repo.nome }),
    })
      .then((r) => r.json())
      .then((data) =>
        setBranches((data.branches || []).map((b: { name: string }) => b.name))
      )
      .catch(() => setBranches([]))
      .finally(() => setCarregando(false));
  }, [repoSelecionado, repos, modo]);

  const repoAtual = repos.find((r) => r.id === repoSelecionado);
  const branchesFiltradas = branches.filter(
    (b) => !busca || b.toLowerCase().includes(busca.toLowerCase())
  );

  function handleSelecionarBranch(branchName: string) {
    onAtualizar({ branch: branchName, branch_repo_id: repoSelecionado });
    setModo("manual");
    setInputManual(branchName);
  }

  function handleSalvarManual() {
    const val = inputManual.trim() || null;
    onAtualizar({
      branch: val,
      branch_repo_id: val ? repoSelecionado : null,
    });
  }

  function handleLimpar() {
    onAtualizar({ branch: null, branch_repo_id: null });
    setInputManual("");
    setModo("selecionar");
  }

  // Estado: branch já associada
  if (cartao.branch && modo === "manual") {
    const repoRef = repoAtual || repos.find((r) => r.id === cartao.branch_repo_id);
    const repoNome = repoRef ? `${repoRef.owner}/${repoRef.nome}` : null;

    return (
      <div
        className="p-3.5 space-y-2.5"
        style={{
          background: "var(--tf-bg-secondary)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
          Branch
        </p>
        <div
          className="flex items-center gap-2 px-2.5 py-2"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <GitBranch size={13} strokeWidth={1.75} style={{ color: "var(--tf-accent)" }} />
          <span
            className="text-[0.8125rem] font-medium"
            style={{
              color: "var(--tf-text)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.01em",
            }}
          >
            {cartao.branch}
          </span>
        </div>
        {repoNome && (
          <p
            className="text-[0.6875rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            {repoNome}
          </p>
        )}
        <div className="flex items-center gap-3">
          {repoAtual && cartao.branch && (
            <a
              href={`https://github.com/${repoAtual.owner}/${repoAtual.nome}/tree/${cartao.branch}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.6875rem] font-medium hover:underline flex items-center gap-1"
              style={{
                color: "var(--tf-accent)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <ExternalLink size={10} strokeWidth={1.75} />
              Ver no GitHub
            </a>
          )}
          <button
            onClick={() => setModo("selecionar")}
            className="text-[0.6875rem] font-medium hover:text-[var(--tf-text)] transition-colors"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Trocar
          </button>
          <button
            onClick={handleLimpar}
            className="text-[0.6875rem] font-medium hover:brightness-110 transition-all"
            style={{
              color: "var(--tf-danger)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Limpar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--tf-bg-secondary)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-md)",
      }}
    >
      <div className="p-3 space-y-2">
        <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
          Associar branch
        </p>

        {/* Repo selector */}
        {repos.length > 1 && (
          <select
            value={repoSelecionado || ""}
            onChange={(e) => {
              setRepoSelecionado(e.target.value);
              setBranches([]);
              setBusca("");
            }}
            className="branch-input w-full h-8 px-2.5 text-[0.75rem] outline-none"
            style={{
              color: "var(--tf-text)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <option value="">Selecionar repositório…</option>
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.owner}/{r.nome}
              </option>
            ))}
          </select>
        )}

        {repos.length === 1 && (
          <p
            className="text-[0.6875rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            {repos[0].owner}/{repos[0].nome}
          </p>
        )}

        {/* Branch search */}
        {repoSelecionado && modo !== "manual" && (
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar branch…"
            className="branch-input w-full h-8 px-2.5 text-[0.75rem] outline-none"
            style={{
              color: "var(--tf-text)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
            }}
            autoFocus
          />
        )}

        {/* Manual input toggle */}
        <button
          onClick={() => setModo(modo === "manual" ? "selecionar" : "manual")}
          className="text-[0.6875rem] font-medium hover:text-[var(--tf-text)] transition-colors"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {modo === "manual" ? "Escolher da lista" : "Digitar manualmente"}
        </button>
      </div>

      {modo === "manual" ? (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2">
            <GitBranch size={12} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
            <input
              value={inputManual}
              onChange={(e) => setInputManual(e.target.value)}
              onBlur={handleSalvarManual}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSalvarManual();
              }}
              placeholder="feature/minha-branch"
              className="flex-1 h-8 px-2.5 text-[0.8125rem] outline-none"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
                color: "var(--tf-text)",
                fontFamily: "var(--tf-font-mono)",
              }}
              autoFocus
            />
          </div>
        </div>
      ) : repoSelecionado ? (
        <div className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {carregando ? (
            <div
              className="flex items-center justify-center py-5 gap-2"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <Loader2 size={12} className="animate-spin" />
              <span
                className="text-[0.6875rem]"
                style={{
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.02em",
                }}
              >
                Carregando branches…
              </span>
            </div>
          ) : branchesFiltradas.length === 0 ? (
            <p
              className="text-center py-5 text-[0.6875rem]"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
              }}
            >
              {busca ? "Nenhuma branch encontrada" : "Sem branches"}
            </p>
          ) : (
            branchesFiltradas.map((b, i) => (
              <button
                key={b}
                onClick={() => handleSelecionarBranch(b)}
                className="w-full flex items-center gap-2.5 px-3 h-8 text-left transition-colors hover:bg-[var(--tf-surface-hover)]"
                style={{
                  borderTop: i === 0 ? "1px solid var(--tf-border)" : "1px solid var(--tf-border-subtle)",
                }}
              >
                <GitBranch
                  size={11}
                  strokeWidth={1.75}
                  style={{ color: "var(--tf-text-tertiary)" }}
                />
                <span
                  className="text-[0.75rem] font-medium"
                  style={{
                    color: "var(--tf-text)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {b}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      <style jsx>{`
        .branch-input {
          background: var(--tf-surface);
          border: 1px solid var(--tf-border);
          transition: border-color 0.15s ease;
        }
        .branch-input:focus {
          border-color: var(--tf-accent);
        }
      `}</style>
    </div>
  );
}
