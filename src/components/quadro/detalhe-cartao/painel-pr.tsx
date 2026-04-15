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
        ? "var(--tf-merged)"
        : "var(--tf-danger)";

  const statusLabel =
    cartao.pr_status === "open"
      ? "Aberto"
      : cartao.pr_status === "merged"
        ? "Merged"
        : "Fechado";

  const historico = Array.isArray(cartao.pr_historico) ? cartao.pr_historico : [];

  useEffect(() => {
    if (!cartao.pr_numero || !cartao.pr_repo_id) return;
    setCarregandoInfo(true);

    (async () => {
      try {
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

  useEffect(() => {
    if (!vinculando || !cartao.workspace_id) return;
    (async () => {
      const { supabase } = await import("@/lib/supabase/client");
      const { data: repos } = await supabase
        .from("repositorios")
        .select("id, owner, nome")
        .eq("workspace_id", cartao.workspace_id);

      if (repos && repos.length > 0) {
        const repo = repos[0];
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
      year: "2-digit",
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
          className="p-3.5"
          style={{
            background: "var(--tf-bg-secondary)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-md)",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <GitPullRequest size={14} strokeWidth={1.75} style={{ color: statusCor }} />
            <span
              className="text-[0.8125rem] font-medium truncate"
              style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
            >
              <span style={{ fontFamily: "var(--tf-font-mono)" }}>#{cartao.pr_numero}</span>
              {prInfo &&
                !carregandoInfo &&
                prInfo.title &&
                !prInfo.title.startsWith(`PR #${cartao.pr_numero}`) && (
                  <span
                    className="font-normal ml-2"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    {prInfo.title}
                  </span>
                )}
            </span>
            <span
              className="inline-flex items-center gap-1 h-[17px] px-1.5 text-[0.625rem] font-medium shrink-0 ml-auto"
              style={{
                background: `color-mix(in srgb, ${statusCor} 12%, transparent)`,
                color: statusCor,
                border: `1px solid ${statusCor}`,
                borderRadius: "var(--tf-radius-xs)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              <span className="w-1.5 h-1.5" style={{ background: statusCor, borderRadius: "1px" }} />
              {statusLabel}
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              {cartao.pr_url && (
                <a
                  href={cartao.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                  title="Abrir no GitHub"
                >
                  <ExternalLink size={12} strokeWidth={1.75} />
                </a>
              )}
              {!confirmDesvincular ? (
                <button
                  onClick={() => setConfirmDesvincular(true)}
                  className="p-1 transition-colors hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                  title="Desvincular PR"
                >
                  <X size={12} strokeWidth={1.75} />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDesvincular}
                    className="h-6 px-2 text-[0.625rem] font-medium text-white transition-colors hover:brightness-110"
                    style={{
                      background: "var(--tf-danger)",
                      border: "1px solid var(--tf-danger)",
                      borderRadius: "var(--tf-radius-xs)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                    }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmDesvincular(false)}
                    className="h-6 px-2 text-[0.625rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)]"
                    style={{
                      color: "var(--tf-text-secondary)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-xs)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="ml-[22px] space-y-0.5">
            {prInfo && !carregandoInfo && (
              <p
                className="text-[0.6875rem]"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                {prInfo.repoFullName}
              </p>
            )}
            {cartao.pr_autor && (
              <p
                className="text-[0.6875rem]"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                por <span style={{ color: "var(--tf-text-secondary)" }}>{cartao.pr_autor}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Vincular PR existente */}
      {!cartao.pr_numero && painelAberto && (
        <div>
          {!vinculando ? (
            <button
              onClick={() => setVinculando(true)}
              className="w-full flex items-center justify-center gap-2 h-11 text-[0.75rem] font-medium transition-colors hover:border-[var(--tf-accent)] hover:text-[var(--tf-accent)]"
              style={{
                border: "1px dashed var(--tf-border-strong)",
                borderRadius: "var(--tf-radius-md)",
                color: "var(--tf-text-secondary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <GitPullRequest size={13} strokeWidth={1.75} />
              Vincular PR existente
            </button>
          ) : (
            <div
              className="overflow-hidden"
              style={{
                background: "var(--tf-bg-secondary)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-md)",
              }}
            >
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
                    PRs abertas {repoInfo && `— ${repoInfo.owner}/${repoInfo.nome}`}
                  </p>
                  <button
                    onClick={() => {
                      setVinculando(false);
                      setBuscaPR("");
                    }}
                    className="p-1 transition-colors hover:bg-[var(--tf-surface-hover)]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    <X size={11} strokeWidth={1.75} />
                  </button>
                </div>
                <input
                  value={buscaPR}
                  onChange={(e) => setBuscaPR(e.target.value)}
                  placeholder="Buscar por título ou número…"
                  className="pr-input w-full h-8 px-2.5 text-[0.75rem] outline-none"
                  style={{
                    color: "var(--tf-text)",
                    borderRadius: "var(--tf-radius-xs)",
                    letterSpacing: "-0.005em",
                  }}
                  autoFocus
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                {carregandoPrs ? (
                  <div
                    className="flex items-center justify-center py-5 gap-2"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    <Loader2 size={12} className="animate-spin" />
                    <span
                      className="text-[0.6875rem]"
                      style={{ fontFamily: "var(--tf-font-mono)" }}
                    >
                      Carregando PRs…
                    </span>
                  </div>
                ) : prsFiltrados.length === 0 ? (
                  <p
                    className="text-center py-5 text-[0.6875rem]"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {buscaPR ? "Nenhuma PR encontrada" : "Sem PRs abertas"}
                  </p>
                ) : (
                  prsFiltrados.map((pr, i) => (
                    <button
                      key={pr.number}
                      onClick={() => handleVincular(pr)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--tf-surface-hover)]"
                      style={{
                        borderTop:
                          i === 0
                            ? "1px solid var(--tf-border)"
                            : "1px solid var(--tf-border-subtle)",
                      }}
                    >
                      <GitPullRequest
                        size={12}
                        strokeWidth={1.75}
                        style={{ color: "var(--tf-success)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[0.6875rem]"
                            style={{
                              color: "var(--tf-text-tertiary)",
                              fontFamily: "var(--tf-font-mono)",
                            }}
                          >
                            #{pr.number}
                          </span>
                          <span
                            className="text-[0.75rem] font-medium truncate"
                            style={{
                              color: "var(--tf-text)",
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {pr.title}
                          </span>
                        </div>
                        <span
                          className="text-[0.625rem]"
                          style={{
                            color: "var(--tf-text-tertiary)",
                            fontFamily: "var(--tf-font-mono)",
                          }}
                        >
                          {pr.user.login}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <style jsx>{`
                .pr-input {
                  background: var(--tf-surface);
                  border: 1px solid var(--tf-border);
                  transition: border-color 0.15s ease;
                }
                .pr-input:focus {
                  border-color: var(--tf-accent);
                }
              `}</style>
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="mt-3">
          <p className="label-mono mb-2" style={{ color: "var(--tf-text-tertiary)" }}>
            Histórico
          </p>
          <div className="space-y-1">
            {historico.map((h, i) => {
              const cor = h.status === "merged" ? "var(--tf-merged)" : "var(--tf-danger)";
              const iconeLabel = h.status === "merged" ? "✓ Merged" : "✗ Rejeitado";
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 h-8 text-[0.6875rem]"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                  }}
                >
                  <span
                    className="font-medium"
                    style={{ color: cor, letterSpacing: "0.02em" }}
                  >
                    {iconeLabel}
                  </span>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    #{h.numero}
                  </a>
                  <span style={{ color: "var(--tf-text-tertiary)" }}>{h.autor}</span>
                  <span className="ml-auto" style={{ color: "var(--tf-text-tertiary)" }}>
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
