"use client";

import {
  ArrowLeft, GitPullRequest, GitMerge, GitBranch, ArrowRight,
  ChevronDown, ChevronRight, FileText, FilePlus, FileX, FilePen,
  MessageSquare, GitCommit, Loader2, XCircle, CircleDot, ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  useGitHubPRDetalhe,
  useGitHubPRFiles,
  useGitHubPRCommits,
  useGitHubPRComments,
  type GitHubPRFile,
  type GitHubComment,
} from "@/hooks/use-github";
import type { GitHubCommit } from "@/types/github";

interface PRDetalheProps {
  owner: string;
  nome: string;
  prNumber: number;
  repoId?: string;
  onVoltar: () => void;
}

function tempoAtras(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  const hrs = Math.floor(min / 60);
  const dias = Math.floor(hrs / 24);
  if (dias > 30) return `${Math.floor(dias / 30)}m atrás`;
  if (dias > 0) return `${dias}d atrás`;
  if (hrs > 0) return `${hrs}h atrás`;
  if (min > 0) return `${min}min atrás`;
  return "agora";
}

// ─── File Status Icon ───
function FileStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "added": return <FilePlus size={14} style={{ color: "#22c55e" }} />;
    case "removed": return <FileX size={14} style={{ color: "#ef4444" }} />;
    case "renamed": return <FilePen size={14} style={{ color: "#a855f7" }} />;
    default: return <FilePen size={14} style={{ color: "#eab308" }} />;
  }
}

function FileStatusBadge({ status }: { status: string }) {
  const cores: Record<string, { bg: string; fg: string; label: string }> = {
    added: { bg: "#22c55e20", fg: "#22c55e", label: "Adicionado" },
    removed: { bg: "#ef444420", fg: "#ef4444", label: "Removido" },
    modified: { bg: "#eab30820", fg: "#eab308", label: "Modificado" },
    renamed: { bg: "#a855f720", fg: "#a855f7", label: "Renomeado" },
    changed: { bg: "#3b82f620", fg: "#3b82f6", label: "Alterado" },
  };
  const c = cores[status] || cores.changed;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: c.bg, color: c.fg }}>
      {c.label}
    </span>
  );
}

// ─── Diff Renderer ───
function DiffView({ patch }: { patch: string }) {
  const lines = patch.split("\n");
  return (
    <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, overflowX: "auto" }}>
      {lines.map((line, i) => {
        let bg = "transparent";
        let color = "var(--tf-text)";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          bg = "#22c55e12"; color = "#4ade80";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          bg = "#ef444412"; color = "#f87171";
        } else if (line.startsWith("@@")) {
          bg = "#3b82f610"; color = "#60a5fa";
        }
        return (
          <div key={i} style={{ padding: "0 12px", background: bg, color, whiteSpace: "pre", minHeight: 20 }}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

// ─── File Diff Item ───
function FileDiffItem({ file }: { file: GitHubPRFile }) {
  const [aberto, setAberto] = useState(false);
  const nomeArquivo = file.filename.split("/").pop() || file.filename;
  const caminho = file.filename.includes("/") ? file.filename.substring(0, file.filename.lastIndexOf("/")) : "";

  return (
    <div style={{ border: "1px solid var(--tf-border)", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", background: "var(--tf-bg-secondary)", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        {aberto ? <ChevronDown size={14} style={{ color: "var(--tf-text-tertiary)", flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: "var(--tf-text-tertiary)", flexShrink: 0 }} />}
        <FileStatusIcon status={file.status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tf-text)" }}>{nomeArquivo}</span>
          {caminho && <span style={{ fontSize: 11, color: "var(--tf-text-tertiary)", marginLeft: 6 }}>{caminho}/</span>}
        </div>
        <FileStatusBadge status={file.status} />
        <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, fontFamily: "monospace" }}>+{file.additions}</span>
        <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, fontFamily: "monospace" }}>-{file.deletions}</span>
      </button>
      {aberto && file.patch && (
        <div style={{ borderTop: "1px solid var(--tf-border)" }}>
          <DiffView patch={file.patch} />
        </div>
      )}
      {aberto && !file.patch && (
        <div style={{ padding: 20, textAlign: "center", color: "var(--tf-text-tertiary)", fontSize: 12 }}>
          Arquivo binário ou muito grande para exibir diff
        </div>
      )}
    </div>
  );
}

// ─── Comment Item ───
function CommentItem({ comment }: { comment: GitHubComment }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--tf-border)" }}>
      <img src={comment.user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tf-text)" }}>{comment.user.login}</span>
          <span style={{ fontSize: 11, color: "var(--tf-text-tertiary)" }}>{tempoAtras(comment.created_at)}</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--tf-text-secondary)", marginTop: 4, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          {comment.body}
        </p>
      </div>
    </div>
  );
}

// ─── Commit Item ───
function CommitItem({ commit }: { commit: GitHubCommit }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--tf-border)" }}>
      <GitCommit size={16} style={{ color: "var(--tf-text-tertiary)", flexShrink: 0 }} />
      {commit.author && (
        <img src={commit.author.avatar_url} alt="" style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--tf-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {commit.commit.message.split("\n")[0]}
        </p>
      </div>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--tf-text-tertiary)" }}>
        {commit.sha.substring(0, 7)}
      </span>
      <span style={{ fontSize: 11, color: "var(--tf-text-tertiary)" }}>
        {tempoAtras(commit.commit.author.date)}
      </span>
    </div>
  );
}

// ─── Main Component ───
export function PRDetalhe({ owner, nome, prNumber, repoId, onVoltar }: PRDetalheProps) {
  const { pr, carregando: carregandoPR, revalidar: revalidarPR } = useGitHubPRDetalhe(owner, nome, prNumber);
  const { files, carregando: carregandoFiles } = useGitHubPRFiles(owner, nome, prNumber);
  const { commits, carregando: carregandoCommits } = useGitHubPRCommits(owner, nome, prNumber);
  const { comments, carregando: carregandoComments, revalidar: revalidarComments } = useGitHubPRComments(owner, nome, prNumber);

  const [tab, setTab] = useState<"resumo" | "arquivos" | "commits">("arquivos");
  const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">("merge");
  const [commitMsg, setCommitMsg] = useState("");
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [rejeitando, setRejeitando] = useState(false);
  const [comentarioRejeicao, setComentarioRejeicao] = useState("");

  const ehAberto = pr?.state === "open" && !pr?.merged_at;
  const ehMerged = !!pr?.merged_at;
  const ehClosed = pr?.state === "closed" && !pr?.merged_at;

  const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);

  async function handleMerge() {
    if (!repoId) return;
    setExecutando(true);
    setErro(null);

    // Buscar card vinculado
    const { data: card } = await supabase
      .from("cartoes")
      .select("id")
      .eq("pr_repo_id", repoId)
      .eq("pr_numero", prNumber)
      .single();

    if (!card) {
      setErro("Nenhum card vinculado a este PR. Configure o webhook primeiro.");
      setExecutando(false);
      return;
    }

    const res = await fetch("/api/pr-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "merge",
        cardId: card.id,
        mergeMethod,
        commitTitle: commitMsg || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) setErro(data.error);
    else revalidarPR();
    setExecutando(false);
  }

  async function handleRejeitar() {
    if (!repoId) return;
    setExecutando(true);
    setErro(null);

    const { data: card } = await supabase
      .from("cartoes")
      .select("id")
      .eq("pr_repo_id", repoId)
      .eq("pr_numero", prNumber)
      .single();

    if (!card) {
      setErro("Nenhum card vinculado a este PR.");
      setExecutando(false);
      return;
    }

    const res = await fetch("/api/pr-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "close",
        cardId: card.id,
        comment: comentarioRejeicao || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) setErro(data.error);
    else { revalidarPR(); revalidarComments(); setRejeitando(false); }
    setExecutando(false);
  }

  if (carregandoPR) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "var(--tf-text-tertiary)" }}>
        <Loader2 size={20} className="animate-spin" />
        <span style={{ marginLeft: 8, fontSize: 13 }}>Carregando PR...</span>
      </div>
    );
  }

  if (!pr) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "var(--tf-text-tertiary)" }}>PR não encontrado</p>
        <button onClick={onVoltar} style={{ marginTop: 12, color: "var(--tf-accent)", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
          ← Voltar
        </button>
      </div>
    );
  }

  const mergeLabels = { merge: "Merge Commit", squash: "Squash Merge", rebase: "Rebase" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ─── Header ─── */}
      <div>
        <button onClick={onVoltar} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--tf-text-tertiary)", fontSize: 12, marginBottom: 12 }}>
          <ArrowLeft size={14} /> Voltar para Pull Requests
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--tf-text)", lineHeight: 1.3, margin: 0 }}>
              {pr.title}
              <span style={{ fontWeight: 400, color: "var(--tf-text-tertiary)", marginLeft: 8 }}>#{pr.number}</span>
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              {/* Status */}
              {ehMerged && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#8b5cf620", color: "#8b5cf6" }}>
                  <GitMerge size={13} /> Merged
                </span>
              )}
              {ehClosed && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#ef444420", color: "#ef4444" }}>
                  <XCircle size={13} /> Fechado
                </span>
              )}
              {ehAberto && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: "#22c55e20", color: "#22c55e" }}>
                  <CircleDot size={13} /> Aberto
                </span>
              )}
              {/* Author */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <img src={pr.user.avatar_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />
                <span style={{ fontSize: 12, color: "var(--tf-text-secondary)" }}>{pr.user.login}</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--tf-text-tertiary)" }}>{tempoAtras(pr.created_at)}</span>
              {/* Branches */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--tf-text-tertiary)" }}>
                <GitBranch size={11} />
                <span style={{ fontFamily: "monospace", background: "var(--tf-bg-secondary)", borderRadius: 4, padding: "0 5px" }}>{pr.head.ref}</span>
                <ArrowRight size={10} />
                <span style={{ fontFamily: "monospace", background: "var(--tf-bg-secondary)", borderRadius: 4, padding: "0 5px" }}>{pr.base.ref}</span>
              </div>
            </div>
          </div>
          <a href={pr.html_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--tf-text-tertiary)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--tf-border)" }}>
            <ExternalLink size={12} /> GitHub
          </a>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px", borderRadius: 8, background: "var(--tf-bg-secondary)", fontSize: 12 }}>
        <span style={{ color: "var(--tf-text-secondary)" }}><strong>{files.length}</strong> arquivo{files.length !== 1 ? "s" : ""}</span>
        <span style={{ color: "#22c55e", fontWeight: 600 }}>+{totalAdditions}</span>
        <span style={{ color: "#ef4444", fontWeight: 600 }}>-{totalDeletions}</span>
        <span style={{ color: "var(--tf-text-secondary)" }}><strong>{commits.length}</strong> commit{commits.length !== 1 ? "s" : ""}</span>
        {comments.length > 0 && <span style={{ color: "var(--tf-text-secondary)" }}><strong>{comments.length}</strong> comentário{comments.length !== 1 ? "s" : ""}</span>}
      </div>

      {/* ─── Tabs ─── */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--tf-border)" }}>
        {([
          { id: "arquivos" as const, label: "Arquivos", icon: FileText, count: files.length },
          { id: "commits" as const, label: "Commits", icon: GitCommit, count: commits.length },
          { id: "resumo" as const, label: "Comentários", icon: MessageSquare, count: comments.length },
        ]).map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
              fontSize: 13, fontWeight: tab === id ? 600 : 400, border: "none", cursor: "pointer",
              borderBottom: `2px solid ${tab === id ? "var(--tf-accent)" : "transparent"}`,
              color: tab === id ? "var(--tf-accent-text)" : "var(--tf-text-tertiary)",
              background: "transparent", transition: "all 0.15s",
            }}
          >
            <Icon size={14} /> {label}
            {count > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "0 5px", borderRadius: 10, background: tab === id ? "var(--tf-accent-light)" : "var(--tf-bg-secondary)", color: tab === id ? "var(--tf-accent-text)" : "var(--tf-text-tertiary)" }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tab === "arquivos" && (
            carregandoFiles ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--tf-text-tertiary)" }}>
                <Loader2 size={16} className="animate-spin" /><span style={{ marginLeft: 6, fontSize: 12 }}>Carregando arquivos...</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {files.map((f) => <FileDiffItem key={f.sha || f.filename} file={f} />)}
              </div>
            )
          )}

          {tab === "commits" && (
            carregandoCommits ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--tf-text-tertiary)" }}>
                <Loader2 size={16} className="animate-spin" /><span style={{ marginLeft: 6, fontSize: 12 }}>Carregando commits...</span>
              </div>
            ) : (
              <div>{commits.map((c) => <CommitItem key={c.sha} commit={c} />)}</div>
            )
          )}

          {tab === "resumo" && (
            <div>
              {/* Descrição do PR */}
              {pr.body && (
                <div style={{ padding: 16, borderRadius: 8, border: "1px solid var(--tf-border)", marginBottom: 16, fontSize: 13, color: "var(--tf-text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {pr.body}
                </div>
              )}
              {/* Comentários */}
              {carregandoComments ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--tf-text-tertiary)" }}>
                  <Loader2 size={16} className="animate-spin" /><span style={{ marginLeft: 6, fontSize: 12 }}>Carregando comentários...</span>
                </div>
              ) : comments.length === 0 ? (
                <p style={{ textAlign: "center", padding: 20, color: "var(--tf-text-tertiary)", fontSize: 12 }}>Nenhum comentário</p>
              ) : (
                comments.map((c) => <CommentItem key={c.id} comment={c} />)
              )}
            </div>
          )}
        </div>

        {/* ─── Action Panel (sidebar) ─── */}
        {repoId && (
          <div style={{ width: 280, flexShrink: 0, position: "sticky", top: 16 }}>
            <div style={{ padding: 16, borderRadius: 10, border: "1px solid var(--tf-border)", background: "var(--tf-surface)" }}>
              {ehAberto && !rejeitando ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--tf-text)", margin: 0 }}>Completar merge</h4>

                  {/* Merge strategy */}
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "var(--tf-text-tertiary)", display: "block", marginBottom: 4 }}>Tipo de merge</label>
                    <div style={{ position: "relative" }}>
                      <select
                        value={mergeMethod}
                        onChange={(e) => setMergeMethod(e.target.value as "merge" | "squash" | "rebase")}
                        style={{ width: "100%", appearance: "none", fontSize: 12, padding: "6px 10px", paddingRight: 28, borderRadius: 6, border: "1px solid var(--tf-border)", background: "var(--tf-bg)", color: "var(--tf-text)", cursor: "pointer" }}
                      >
                        <option value="merge">Merge Commit</option>
                        <option value="squash">Squash Merge</option>
                        <option value="rebase">Rebase</option>
                      </select>
                      <ChevronDown size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--tf-text-tertiary)" }} />
                    </div>
                  </div>

                  {/* Commit message */}
                  {mergeMethod !== "rebase" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 500, color: "var(--tf-text-tertiary)", display: "block", marginBottom: 4 }}>Mensagem do commit (opcional)</label>
                      <input
                        value={commitMsg}
                        onChange={(e) => setCommitMsg(e.target.value)}
                        placeholder={`${mergeLabels[mergeMethod]}: PR #${prNumber}`}
                        style={{ width: "100%", fontSize: 12, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--tf-border)", background: "var(--tf-bg)", color: "var(--tf-text)", outline: "none" }}
                      />
                    </div>
                  )}

                  {erro && <p style={{ fontSize: 11, color: "#ef4444", margin: 0, padding: "6px 8px", borderRadius: 6, background: "#ef444415" }}>{erro}</p>}

                  <button
                    onClick={handleMerge}
                    disabled={executando}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", fontSize: 13, fontWeight: 600, color: "#fff", background: executando ? "#16a34a88" : "#16a34a", border: "none", borderRadius: 8, cursor: executando ? "wait" : "pointer" }}
                  >
                    {executando ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                    {executando ? "Merging..." : `Completar ${mergeLabels[mergeMethod]}`}
                  </button>

                  <div style={{ borderTop: "1px solid var(--tf-border)", paddingTop: 12 }}>
                    <button
                      onClick={() => setRejeitando(true)}
                      style={{ width: "100%", padding: "7px 0", fontSize: 12, fontWeight: 600, color: "#ef4444", background: "transparent", border: "1px solid #ef444440", borderRadius: 8, cursor: "pointer" }}
                    >
                      Rejeitar PR
                    </button>
                  </div>
                </div>
              ) : ehAberto && rejeitando ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", margin: 0 }}>Rejeitar Pull Request</h4>
                  <textarea
                    value={comentarioRejeicao}
                    onChange={(e) => setComentarioRejeicao(e.target.value)}
                    placeholder="Motivo da rejeição (opcional)..."
                    rows={3}
                    style={{ width: "100%", fontSize: 12, padding: "8px 10px", borderRadius: 6, border: "1px solid var(--tf-border)", background: "var(--tf-bg)", color: "var(--tf-text)", resize: "none", outline: "none" }}
                  />
                  {erro && <p style={{ fontSize: 11, color: "#ef4444", margin: 0 }}>{erro}</p>}
                  <button
                    onClick={handleRejeitar}
                    disabled={executando}
                    style={{ width: "100%", padding: "8px 0", fontSize: 13, fontWeight: 600, color: "#fff", background: "#ef4444", border: "none", borderRadius: 8, cursor: "pointer" }}
                  >
                    {executando ? "Rejeitando..." : "Confirmar Rejeição"}
                  </button>
                  <button
                    onClick={() => { setRejeitando(false); setComentarioRejeicao(""); }}
                    style={{ width: "100%", padding: "6px 0", fontSize: 12, color: "var(--tf-text-tertiary)", background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : ehMerged ? (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", background: "#8b5cf620" }}>
                    <GitMerge size={24} style={{ color: "#8b5cf6" }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#8b5cf6", margin: 0 }}>Merged</p>
                  <p style={{ fontSize: 11, color: "var(--tf-text-tertiary)", marginTop: 4 }}>
                    {pr.merged_at && tempoAtras(pr.merged_at)}
                  </p>
                </div>
              ) : ehClosed ? (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", background: "#ef444420" }}>
                    <XCircle size={24} style={{ color: "#ef4444" }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#ef4444", margin: 0 }}>Fechado</p>
                  <p style={{ fontSize: 11, color: "var(--tf-text-tertiary)", marginTop: 4 }}>
                    {pr.closed_at && tempoAtras(pr.closed_at)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
