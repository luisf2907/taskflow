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
    case "added": return <FilePlus size={14} className="text-green-500" />;
    case "removed": return <FileX size={14} className="text-red-500" />;
    case "renamed": return <FilePen size={14} className="text-purple-500" />;
    default: return <FilePen size={14} className="text-yellow-500" />;
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
    <span
      className="text-[10px] font-semibold px-1.5 py-px rounded-[4px]"
      style={{ background: c.bg, color: c.fg }}
    >
      {c.label}
    </span>
  );
}

// ─── Diff Renderer ───
function DiffView({ patch }: { patch: string }) {
  const lines = patch.split("\n");
  return (
    <div className="font-mono text-xs leading-[1.6] overflow-x-auto">
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
          <div key={i} className="px-3 whitespace-pre min-h-5" style={{ background: bg, color }}>
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
    <div className="rounded-[8px] overflow-hidden" style={{ border: "1px solid var(--tf-border)" }}>
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 border-none cursor-pointer text-left"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        {aberto ? (
          <ChevronDown size={14} className="shrink-0" style={{ color: "var(--tf-text-tertiary)" }} />
        ) : (
          <ChevronRight size={14} className="shrink-0" style={{ color: "var(--tf-text-tertiary)" }} />
        )}
        <FileStatusIcon status={file.status} />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>{nomeArquivo}</span>
          {caminho && <span className="text-[11px] ml-1.5" style={{ color: "var(--tf-text-tertiary)" }}>{caminho}/</span>}
        </div>
        <FileStatusBadge status={file.status} />
        <span className="text-[11px] font-semibold font-mono text-green-500">+{file.additions}</span>
        <span className="text-[11px] font-semibold font-mono text-red-500">-{file.deletions}</span>
      </button>
      {aberto && file.patch && (
        <div style={{ borderTop: "1px solid var(--tf-border)" }}>
          <DiffView patch={file.patch} />
        </div>
      )}
      {aberto && !file.patch && (
        <div className="p-5 text-center text-xs" style={{ color: "var(--tf-text-tertiary)" }}>
          Arquivo binário ou muito grande para exibir diff
        </div>
      )}
    </div>
  );
}

// ─── Comment Item ───
function CommentItem({ comment }: { comment: GitHubComment }) {
  return (
    <div className="flex gap-2.5 py-3" style={{ borderBottom: "1px solid var(--tf-border)" }}>
      <img src={comment.user.avatar_url} alt="" className="w-7 h-7 rounded-full shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--tf-text)" }}>{comment.user.login}</span>
          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>{tempoAtras(comment.created_at)}</span>
        </div>
        <p className="text-[13px] mt-1 leading-normal whitespace-pre-wrap" style={{ color: "var(--tf-text-secondary)" }}>
          {comment.body}
        </p>
      </div>
    </div>
  );
}

// ─── Commit Item ───
function CommitItem({ commit }: { commit: GitHubCommit }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5" style={{ borderBottom: "1px solid var(--tf-border)" }}>
      <GitCommit size={16} className="shrink-0" style={{ color: "var(--tf-text-tertiary)" }} />
      {commit.author && (
        <img src={commit.author.avatar_url} alt="" className="w-[22px] h-[22px] rounded-full shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: "var(--tf-text)" }}>
          {commit.commit.message.split("\n")[0]}
        </p>
      </div>
      <span className="text-[11px] font-mono" style={{ color: "var(--tf-text-tertiary)" }}>
        {commit.sha.substring(0, 7)}
      </span>
      <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
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
      <div className="flex items-center justify-center p-[60px]" style={{ color: "var(--tf-text-tertiary)" }}>
        <Loader2 size={20} className="animate-spin" />
        <span className="ml-2 text-[13px]">Carregando PR...</span>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="text-center p-10">
        <p style={{ color: "var(--tf-text-tertiary)" }}>PR não encontrado</p>
        <button
          onClick={onVoltar}
          className="mt-3 bg-transparent border-none cursor-pointer text-[13px]"
          style={{ color: "var(--tf-accent)" }}
        >
          ← Voltar
        </button>
      </div>
    );
  }

  const mergeLabels = { merge: "Merge Commit", squash: "Squash Merge", rebase: "Rebase" };

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Header ─── */}
      <div>
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-xs mb-3"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          <ArrowLeft size={14} /> Voltar para Pull Requests
        </button>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-lg font-bold leading-tight m-0" style={{ color: "var(--tf-text)" }}>
              {pr.title}
              <span className="font-normal ml-2" style={{ color: "var(--tf-text-tertiary)" }}>#{pr.number}</span>
            </h2>
            <div className="flex items-center gap-2.5 mt-2 flex-wrap">
              {/* Status */}
              {ehMerged && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-[3px] rounded-[20px]" style={{ background: "#8b5cf620", color: "#8b5cf6" }}>
                  <GitMerge size={13} /> Merged
                </span>
              )}
              {ehClosed && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-[3px] rounded-[20px]" style={{ background: "#ef444420", color: "#ef4444" }}>
                  <XCircle size={13} /> Fechado
                </span>
              )}
              {ehAberto && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-[3px] rounded-[20px]" style={{ background: "#22c55e20", color: "#22c55e" }}>
                  <CircleDot size={13} /> Aberto
                </span>
              )}
              {/* Author */}
              <div className="flex items-center gap-[5px]">
                <img src={pr.user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                <span className="text-xs" style={{ color: "var(--tf-text-secondary)" }}>{pr.user.login}</span>
              </div>
              <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>{tempoAtras(pr.created_at)}</span>
              {/* Branches */}
              <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                <GitBranch size={11} />
                <span className="font-mono rounded-[4px] px-[5px]" style={{ background: "var(--tf-bg-secondary)" }}>{pr.head.ref}</span>
                <ArrowRight size={10} />
                <span className="font-mono rounded-[4px] px-[5px]" style={{ background: "var(--tf-bg-secondary)" }}>{pr.base.ref}</span>
              </div>
            </div>
          </div>
          <a
            href={pr.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs no-underline px-3 py-1.5 rounded-[8px]"
            style={{ color: "var(--tf-text-tertiary)", border: "1px solid var(--tf-border)" }}
          >
            <ExternalLink size={12} /> GitHub
          </a>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="flex items-center gap-4 px-3.5 py-2.5 rounded-[8px] text-xs" style={{ background: "var(--tf-bg-secondary)" }}>
        <span style={{ color: "var(--tf-text-secondary)" }}><strong>{files.length}</strong> arquivo{files.length !== 1 ? "s" : ""}</span>
        <span className="font-semibold text-green-500">+{totalAdditions}</span>
        <span className="font-semibold text-red-500">-{totalDeletions}</span>
        <span style={{ color: "var(--tf-text-secondary)" }}><strong>{commits.length}</strong> commit{commits.length !== 1 ? "s" : ""}</span>
        {comments.length > 0 && <span style={{ color: "var(--tf-text-secondary)" }}><strong>{comments.length}</strong> comentário{comments.length !== 1 ? "s" : ""}</span>}
      </div>

      {/* ─── Tabs ─── */}
      <div className="flex gap-0.5" style={{ borderBottom: "1px solid var(--tf-border)" }}>
        {([
          { id: "arquivos" as const, label: "Arquivos", icon: FileText, count: files.length },
          { id: "commits" as const, label: "Commits", icon: GitCommit, count: commits.length },
          { id: "resumo" as const, label: "Comentários", icon: MessageSquare, count: comments.length },
        ]).map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-[5px] px-3.5 py-2 text-[13px] border-none cursor-pointer bg-transparent transition-all duration-150"
            style={{
              fontWeight: tab === id ? 600 : 400,
              borderBottom: `2px solid ${tab === id ? "var(--tf-accent)" : "transparent"}`,
              color: tab === id ? "var(--tf-accent-text)" : "var(--tf-text-tertiary)",
            }}
          >
            <Icon size={14} /> {label}
            {count > 0 && (
              <span
                className="text-[10px] font-semibold px-[5px] rounded-[8px]"
                style={{
                  background: tab === id ? "var(--tf-accent-light)" : "var(--tf-bg-secondary)",
                  color: tab === id ? "var(--tf-accent-text)" : "var(--tf-text-tertiary)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      <div className="flex gap-4 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {tab === "arquivos" && (
            carregandoFiles ? (
              <div className="flex items-center justify-center p-10" style={{ color: "var(--tf-text-tertiary)" }}>
                <Loader2 size={16} className="animate-spin" /><span className="ml-1.5 text-xs">Carregando arquivos...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {files.map((f) => <FileDiffItem key={f.sha || f.filename} file={f} />)}
              </div>
            )
          )}

          {tab === "commits" && (
            carregandoCommits ? (
              <div className="flex items-center justify-center p-10" style={{ color: "var(--tf-text-tertiary)" }}>
                <Loader2 size={16} className="animate-spin" /><span className="ml-1.5 text-xs">Carregando commits...</span>
              </div>
            ) : (
              <div>{commits.map((c) => <CommitItem key={c.sha} commit={c} />)}</div>
            )
          )}

          {tab === "resumo" && (
            <div>
              {/* Descrição do PR */}
              {pr.body && (
                <div
                  className="p-4 rounded-[8px] mb-4 text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{ border: "1px solid var(--tf-border)", color: "var(--tf-text-secondary)" }}
                >
                  {pr.body}
                </div>
              )}
              {/* Comentários */}
              {carregandoComments ? (
                <div className="flex items-center justify-center p-10" style={{ color: "var(--tf-text-tertiary)" }}>
                  <Loader2 size={16} className="animate-spin" /><span className="ml-1.5 text-xs">Carregando comentários...</span>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center p-5 text-xs" style={{ color: "var(--tf-text-tertiary)" }}>Nenhum comentário</p>
              ) : (
                comments.map((c) => <CommentItem key={c.id} comment={c} />)
              )}
            </div>
          )}
        </div>

        {/* ─── Action Panel (sidebar) ─── */}
        {repoId && (
          <div className="w-[280px] shrink-0 sticky top-4">
            <div className="p-4 rounded-[8px]" style={{ border: "1px solid var(--tf-border)", background: "var(--tf-surface)" }}>
              {ehAberto && !rejeitando ? (
                <div className="flex flex-col gap-3">
                  <h4 className="text-[13px] font-bold m-0" style={{ color: "var(--tf-text)" }}>Completar merge</h4>

                  {/* Merge strategy */}
                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--tf-text-tertiary)" }}>Tipo de merge</label>
                    <div className="relative">
                      <select
                        value={mergeMethod}
                        onChange={(e) => setMergeMethod(e.target.value as "merge" | "squash" | "rebase")}
                        className="w-full appearance-none text-xs px-2.5 py-1.5 pr-7 rounded-[8px] cursor-pointer"
                        style={{ border: "1px solid var(--tf-border)", background: "var(--tf-bg)", color: "var(--tf-text)" }}
                      >
                        <option value="merge">Merge Commit</option>
                        <option value="squash">Squash Merge</option>
                        <option value="rebase">Rebase</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--tf-text-tertiary)" }} />
                    </div>
                  </div>

                  {/* Commit message */}
                  {mergeMethod !== "rebase" && (
                    <div>
                      <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--tf-text-tertiary)" }}>Mensagem do commit (opcional)</label>
                      <input
                        value={commitMsg}
                        onChange={(e) => setCommitMsg(e.target.value)}
                        placeholder={`${mergeLabels[mergeMethod]}: PR #${prNumber}`}
                        className="w-full text-xs px-2.5 py-1.5 rounded-[8px] outline-none"
                        style={{ border: "1px solid var(--tf-border)", background: "var(--tf-bg)", color: "var(--tf-text)" }}
                      />
                    </div>
                  )}

                  {erro && <p className="text-[11px] m-0 px-2 py-1.5 rounded-[8px]" style={{ color: "#ef4444", background: "#ef444415" }}>{erro}</p>}

                  <button
                    onClick={handleMerge}
                    disabled={executando}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-[13px] font-semibold text-white border-none rounded-[8px]"
                    style={{
                      background: executando ? "#16a34a88" : "#16a34a",
                      cursor: executando ? "wait" : "pointer",
                    }}
                  >
                    {executando ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                    {executando ? "Merging..." : `Completar ${mergeLabels[mergeMethod]}`}
                  </button>

                  <div className="pt-3" style={{ borderTop: "1px solid var(--tf-border)" }}>
                    <button
                      onClick={() => setRejeitando(true)}
                      className="w-full py-[7px] text-xs font-semibold bg-transparent rounded-[8px] cursor-pointer"
                      style={{ color: "#ef4444", border: "1px solid #ef444440" }}
                    >
                      Rejeitar PR
                    </button>
                  </div>
                </div>
              ) : ehAberto && rejeitando ? (
                <div className="flex flex-col gap-2.5">
                  <h4 className="text-[13px] font-bold m-0" style={{ color: "#ef4444" }}>Rejeitar Pull Request</h4>
                  <textarea
                    value={comentarioRejeicao}
                    onChange={(e) => setComentarioRejeicao(e.target.value)}
                    placeholder="Motivo da rejeição (opcional)..."
                    rows={3}
                    className="w-full text-xs px-2.5 py-2 rounded-[8px] resize-none outline-none"
                    style={{ border: "1px solid var(--tf-border)", background: "var(--tf-bg)", color: "var(--tf-text)" }}
                  />
                  {erro && <p className="text-[11px] m-0" style={{ color: "#ef4444" }}>{erro}</p>}
                  <button
                    onClick={handleRejeitar}
                    disabled={executando}
                    className="w-full py-2 text-[13px] font-semibold text-white border-none rounded-[8px] cursor-pointer"
                    style={{ background: "#ef4444" }}
                  >
                    {executando ? "Rejeitando..." : "Confirmar Rejeição"}
                  </button>
                  <button
                    onClick={() => { setRejeitando(false); setComentarioRejeicao(""); }}
                    className="w-full py-1.5 text-xs bg-transparent border-none cursor-pointer"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : ehMerged ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2.5" style={{ background: "#8b5cf620" }}>
                    <GitMerge size={24} style={{ color: "#8b5cf6" }} />
                  </div>
                  <p className="text-sm font-semibold m-0" style={{ color: "#8b5cf6" }}>Merged</p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
                    {pr.merged_at && tempoAtras(pr.merged_at)}
                  </p>
                </div>
              ) : ehClosed ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2.5" style={{ background: "#ef444420" }}>
                    <XCircle size={24} style={{ color: "#ef4444" }} />
                  </div>
                  <p className="text-sm font-semibold m-0" style={{ color: "#ef4444" }}>Fechado</p>
                  <p className="text-[11px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
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
