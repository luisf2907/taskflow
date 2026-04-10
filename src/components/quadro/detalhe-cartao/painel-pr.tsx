"use client";

import { useEffect, useState } from "react";
import { ExternalLink, GitPullRequest, Loader2, X } from "lucide-react";
import { CartaoComResumo } from "@/hooks/use-cartoes";

interface PainelPRProps {
  cartao: CartaoComResumo;
  onRefresh: () => void;
  onAtualizar: (campos: Record<string, unknown>) => void;
  painelAberto: boolean;
}

export function PainelPR({ cartao, onAtualizar, painelAberto }: PainelPRProps) {
  const [prInfo, setPrInfo] = useState<{
    title: string;
    repoFullName: string;
  } | null>(null);
  const [carregandoInfo, setCarregandoInfo] = useState(false);
  const [confirmDesvincular, setConfirmDesvincular] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [prsDisponiveis, setPrsDisponiveis] = useState<
    {
      number: number;
      title: string;
      html_url: string;
      user: { login: string };
      head?: { ref: string };
    }[]
  >([]);
  const [carregandoPrs, setCarregandoPrs] = useState(false);
  const [repoInfo, setRepoInfo] = useState<{
    id: string;
    owner: string;
    nome: string;
  } | null>(null);
  const [buscaPR, setBuscaPR] = useState("");

  const statusCor =
    cartao.pr_status === "open"
      ? "var(--tf-success)"
      : cartao.pr_status === "merged"
        ? "var(--tf-accent)"
        : "var(--tf-danger)";

  const statusLabel =
    cartao.pr_status === "open"
      ? "Aberto"
      : cartao.pr_status === "merged"
        ? "Merged"
        : "Fechado";

  const historico = Array.isArray(cartao.pr_historico) ? cartao.pr_historico : [];

  // Fetch PR title and repo name
  useEffect(() => {
    if (!cartao.pr_numero || !cartao.pr_repo_id) return;
    setCarregandoInfo(true);

    (async () => {
      try {
        // Get repo info from Supabase
        const { supabase } = await import("@/lib/supabase/client");
        const { data: repo } = await supabase
          .from("repositorios")
          .select("owner, nome")
          .eq("id", cartao.pr_repo_id)
          .single();

        if (!repo) {
          setCarregandoInfo(false);
          return;
        }

        const repoFullName = `${repo.owner}/${repo.nome}`;

        // Fetch PR title from GitHub
        const res = await fetch("/api/pr-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: repo.owner,
            repo: repo.nome,
            prNumber: cartao.pr_numero,
          }),
        });
        const data = await res.json();
        setPrInfo({
          title: data.title || `PR #${cartao.pr_numero}`,
          repoFullName,
        });
      } catch {
        setPrInfo(null);
      } finally {
        setCarregandoInfo(false);
      }
    })();
  }, [cartao.pr_numero, cartao.pr_repo_id]);

  // Load repos for linking when panel opens
  useEffect(() => {
    if (!vinculando || !cartao.workspace_id) return;
    (async () => {
      const { supabase } = await import("@/lib/supabase/client");
      const { data: repos } = await supabase
        .from("repositorios")
        .select("id, owner, nome")
        .eq("workspace_id", cartao.workspace_id);

      if (repos && repos.length > 0) {
        const repo = repos[0]; // auto-select first repo
        setRepoInfo(repo);
        setCarregandoPrs(true);
        try {
          const res = await fetch("/api/prs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owner: repo.owner,
              repo: repo.nome,
              state: "open",
            }),
          });
          const data = await res.json();
          setPrsDisponiveis(data.prs || []);
        } catch {
          setPrsDisponiveis([]);
        } finally {
          setCarregandoPrs(false);
        }
      }
    })();
  }, [vinculando, cartao.workspace_id]);

  function handleDesvincular() {
    const entry = cartao.pr_numero
      ? {
          numero: cartao.pr_numero,
          url: cartao.pr_url || "",
          status: cartao.pr_status || "closed",
          autor: cartao.pr_autor || "unknown",
          data: new Date().toISOString(),
        }
      : null;

    const novoHistorico = entry ? [...historico, entry] : historico;

    onAtualizar({
      pr_numero: null,
      pr_url: null,
      pr_status: null,
      pr_repo_id: null,
      pr_autor: null,
      pr_historico: novoHistorico,
    });
    setConfirmDesvincular(false);
    setPrInfo(null);
  }

  function handleVincular(pr: {
    number: number;
    title: string;
    html_url: string;
    user: { login: string };
    head?: { ref: string };
  }) {
    if (!repoInfo) return;
    const campos: Record<string, unknown> = {
      pr_numero: pr.number,
      pr_url: pr.html_url,
      pr_status: "open",
      pr_repo_id: repoInfo.id,
      pr_autor: pr.user.login,
    };
    // Auto-link branch from PR
    if (pr.head?.ref) {
      campos.branch = pr.head.ref;
      campos.branch_repo_id = repoInfo.id;
    }
    onAtualizar(campos);
    setVinculando(false);
    setBuscaPR("");
  }

  function formatarDataPR(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const prsFiltrados = prsDisponiveis.filter(
    (pr) =>
      !buscaPR ||
      pr.title.toLowerCase().includes(buscaPR.toLowerCase()) ||
      `#${pr.number}`.includes(buscaPR)
  );

  return (
    <div>
      {/* PR vinculado */}
      {cartao.pr_numero && (
        <div
          className="p-4 rounded-[14px]"
          style={{ background: "var(--tf-bg-secondary)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <GitPullRequest size={15} style={{ color: statusCor }} />
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--tf-text)" }}
            >
              PR #{cartao.pr_numero}
              {prInfo &&
                !carregandoInfo &&
                prInfo.title &&
                !prInfo.title.startsWith(`PR #${cartao.pr_numero}`) && (
                  <span
                    className="font-normal ml-1"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    {prInfo.title}
                  </span>
                )}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              style={{
                background: `color-mix(in srgb, ${statusCor} 15%, transparent)`,
                color: statusCor,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: statusCor }}
              />
              {statusLabel}
            </span>
            <div className="ml-auto flex items-center gap-1 shrink-0">
              {cartao.pr_url && (
                <a
                  href={cartao.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-[4px] hover:bg-[var(--tf-surface-hover)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    transition: "background 0.15s ease",
                  }}
                  title="Abrir no GitHub"
                >
                  <ExternalLink size={13} />
                </a>
              )}
              {!confirmDesvincular ? (
                <button
                  onClick={() => setConfirmDesvincular(true)}
                  className="p-1 rounded-[4px] hover:bg-[var(--tf-danger-bg)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    transition: "all 0.15s ease",
                  }}
                  title="Desvincular PR"
                >
                  <X size={13} />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDesvincular}
                    className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold"
                    style={{ background: "var(--tf-danger)", color: "#fff" }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmDesvincular(false)}
                    className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      background: "var(--tf-surface-hover)",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Repo name + author */}
          <div className="ml-[23px] space-y-0.5">
            {prInfo && !carregandoInfo && (
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                {prInfo.repoFullName}
              </p>
            )}
            {cartao.pr_autor && (
              <p
                className="text-[11px]"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                por{" "}
                <strong style={{ color: "var(--tf-text-secondary)" }}>
                  {cartao.pr_autor}
                </strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Vincular PR existente (quando não tem PR e painel está aberto) */}
      {!cartao.pr_numero && painelAberto && (
        <div>
          {!vinculando ? (
            <button
              onClick={() => setVinculando(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] text-[13px] font-medium border-2 border-dashed hover:border-solid"
              style={{
                borderColor: "var(--tf-border)",
                color: "var(--tf-text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              <GitPullRequest size={15} />
              Vincular PR existente
            </button>
          ) : (
            <div
              className="rounded-[14px] overflow-hidden"
              style={{
                background: "var(--tf-bg-secondary)",
                border: "1px solid var(--tf-border)",
              }}
            >
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    PRs Abertas {repoInfo && `— ${repoInfo.owner}/${repoInfo.nome}`}
                  </p>
                  <button
                    onClick={() => {
                      setVinculando(false);
                      setBuscaPR("");
                    }}
                    className="p-1 rounded-[4px]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    <X size={12} />
                  </button>
                </div>
                <input
                  value={buscaPR}
                  onChange={(e) => setBuscaPR(e.target.value)}
                  placeholder="Buscar por título ou número..."
                  className="w-full px-3 py-2 text-[12px] rounded-[8px] outline-none"
                  style={{
                    background: "var(--tf-surface)",
                    border: "1px solid var(--tf-border)",
                    color: "var(--tf-text)",
                  }}
                  autoFocus
                />
              </div>
              <div
                className="max-h-[200px] overflow-y-auto"
                style={{ scrollbarWidth: "thin" }}
              >
                {carregandoPrs ? (
                  <div
                    className="flex items-center justify-center py-6 gap-2"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[11px]">Carregando PRs...</span>
                  </div>
                ) : prsFiltrados.length === 0 ? (
                  <p
                    className="text-center py-6 text-[11px]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {buscaPR ? "Nenhuma PR encontrada" : "Sem PRs abertas"}
                  </p>
                ) : (
                  prsFiltrados.map((pr) => (
                    <button
                      key={pr.number}
                      onClick={() => handleVincular(pr)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--tf-surface-hover)]"
                      style={{
                        transition: "background 0.1s ease",
                        borderTop: "1px solid var(--tf-border-subtle)",
                      }}
                    >
                      <GitPullRequest
                        size={13}
                        style={{ color: "var(--tf-success)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[11px] font-mono"
                            style={{ color: "var(--tf-text-tertiary)" }}
                          >
                            #{pr.number}
                          </span>
                          <span
                            className="text-[12px] font-medium truncate"
                            style={{ color: "var(--tf-text)" }}
                          >
                            {pr.title}
                          </span>
                        </div>
                        <span
                          className="text-[10px]"
                          style={{ color: "var(--tf-text-tertiary)" }}
                        >
                          {pr.user.login}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="mt-3">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Histórico
          </p>
          <div className="space-y-1.5">
            {historico.map((h, i) => {
              const cor = h.status === "merged" ? "var(--tf-accent)" : "var(--tf-danger)";
              const iconeLabel =
                h.status === "merged" ? "✓ Merged" : "✗ Rejeitado";
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-[11px]"
                  style={{ background: "var(--tf-bg-secondary)" }}
                >
                  <span className="font-bold" style={{ color: cor }}>
                    {iconeLabel}
                  </span>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    PR #{h.numero}
                  </a>
                  <span style={{ color: "var(--tf-text-tertiary)" }}>
                    por {h.autor}
                  </span>
                  <span
                    className="ml-auto"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {formatarDataPR(h.data)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
