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

  // Load repos
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

  // Load branches when repo selected
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

  // Se já tem branch, mostrar info + opção de limpar
  if (cartao.branch && modo === "manual") {
    const repoNome = repoAtual
      ? `${repoAtual.owner}/${repoAtual.nome}`
      : repos.find((r) => r.id === cartao.branch_repo_id)
        ? `${repos.find((r) => r.id === cartao.branch_repo_id)!.owner}/${
            repos.find((r) => r.id === cartao.branch_repo_id)!.nome
          }`
        : null;

    return (
      <div
        className="p-4 rounded-[14px] space-y-3"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Branch
        </p>
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-[8px]"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
          }}
        >
          <GitBranch size={14} style={{ color: "var(--tf-accent)" }} />
          <span
            className="text-[13px] font-mono font-medium"
            style={{ color: "var(--tf-text)" }}
          >
            {cartao.branch}
          </span>
        </div>
        {repoNome && (
          <p
            className="text-[11px] font-medium ml-1"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            {repoNome}
          </p>
        )}
        <div className="flex items-center gap-2">
          {repoAtual && cartao.branch && (
            <a
              href={`https://github.com/${repoAtual.owner}/${repoAtual.nome}/tree/${cartao.branch}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium hover:underline flex items-center gap-1"
              style={{ color: "var(--tf-accent)" }}
            >
              <ExternalLink size={10} />
              Ver no GitHub
            </a>
          )}
          <button
            onClick={() => {
              setModo("selecionar");
            }}
            className="text-[11px] font-medium hover:underline"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Trocar
          </button>
          <button
            onClick={handleLimpar}
            className="text-[11px] font-medium hover:underline"
            style={{ color: "var(--tf-danger)" }}
          >
            Limpar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: "var(--tf-bg-secondary)",
        border: "1px solid var(--tf-border)",
      }}
    >
      <div className="p-3 space-y-2">
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Associar Branch
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
            className="w-full px-3 py-2 text-[12px] rounded-[8px] outline-none"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
          >
            <option value="">Selecionar repositório...</option>
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.owner}/{r.nome}
              </option>
            ))}
          </select>
        )}

        {repos.length === 1 && (
          <p
            className="text-[11px] font-medium"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            {repos[0].owner}/{repos[0].nome}
          </p>
        )}

        {/* Branch search */}
        {repoSelecionado && (
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar branch..."
            className="w-full px-3 py-2 text-[12px] rounded-[8px] outline-none"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
            autoFocus
          />
        )}

        {/* Manual input toggle */}
        <button
          onClick={() => setModo(modo === "manual" ? "selecionar" : "manual")}
          className="text-[11px] font-medium hover:underline"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          {modo === "manual" ? "Escolher da lista" : "Digitar manualmente"}
        </button>
      </div>

      {modo === "manual" ? (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch size={13} style={{ color: "var(--tf-text-tertiary)" }} />
            <input
              value={inputManual}
              onChange={(e) => setInputManual(e.target.value)}
              onBlur={handleSalvarManual}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSalvarManual();
              }}
              placeholder="feature/minha-branch"
              className="flex-1 px-3 py-2 text-[13px] font-mono rounded-[8px] outline-none"
              style={{
                background: "var(--tf-surface)",
                border: "2px solid var(--tf-accent)",
                color: "var(--tf-text)",
              }}
              autoFocus
            />
          </div>
        </div>
      ) : repoSelecionado ? (
        <div
          className="max-h-[200px] overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {carregando ? (
            <div
              className="flex items-center justify-center py-6 gap-2"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[11px]">Carregando branches...</span>
            </div>
          ) : branchesFiltradas.length === 0 ? (
            <p
              className="text-center py-6 text-[11px]"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              {busca ? "Nenhuma branch encontrada" : "Sem branches"}
            </p>
          ) : (
            branchesFiltradas.map((b) => (
              <button
                key={b}
                onClick={() => handleSelecionarBranch(b)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--tf-surface-hover)]"
                style={{
                  transition: "background 0.1s ease",
                  borderTop: "1px solid var(--tf-border-subtle)",
                }}
              >
                <GitBranch
                  size={12}
                  style={{ color: "var(--tf-text-tertiary)" }}
                />
                <span
                  className="text-[12px] font-mono font-medium"
                  style={{ color: "var(--tf-text)" }}
                >
                  {b}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
