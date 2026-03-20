"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Modal } from "@/components/ui/modal";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useRepositorios } from "@/hooks/use-repositorios";
import { useGitHubRepo } from "@/hooks/use-github";
import { parsearRepo } from "@/lib/github/client";
import { RepoFileBrowser } from "@/components/workspace/repo-file-browser";
import { RepoFileViewer } from "@/components/workspace/repo-file-viewer";
import { RepoBranches } from "@/components/workspace/repo-branches";
import { RepoPRs } from "@/components/workspace/repo-prs";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Plus,
  Star,
  GitFork,
  Code,
  Copy,
  Check,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

// ─── Repo Card ───
function RepoCard({ owner, nome, onAbrir, onDesconectar }: { owner: string; nome: string; onAbrir: () => void; onDesconectar: () => void }) {
  const { repo, carregando } = useGitHubRepo(owner, nome);

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer group hover:shadow-md"
      style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
      onClick={onAbrir}
    >
      <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--tf-accent-light)" }}>
        <GitBranch size={22} style={{ color: "var(--tf-accent-text)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "var(--tf-text)" }}>{owner}/{nome}</p>
        {carregando ? (
          <div className="h-3 w-48 rounded mt-1 animate-pulse" style={{ background: "var(--tf-border)" }} />
        ) : repo ? (
          <div className="flex items-center gap-3 mt-1">
            {repo.language && (
              <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}>
                {repo.language}
              </span>
            )}
            {repo.stargazers_count > 0 && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                <Star size={10} /> {repo.stargazers_count}
              </span>
            )}
            {repo.forks_count > 0 && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                <GitFork size={10} /> {repo.forks_count}
              </span>
            )}
          </div>
        ) : null}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDesconectar(); }}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
        style={{ color: "var(--tf-text-tertiary)" }}
        title="Desconectar"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function ReposPage() {
  const { id: workspaceId } = useParams<{ id: string }>();
  const router = useRouter();
  const { quadros } = useQuadros();
  const { workspaces } = useWorkspaces();
  const { repositorios, conectar: conectarRepo, desconectar: desconectarRepo } = useRepositorios(workspaceId);
  const workspace = workspaces.find((ws) => ws.id === workspaceId);

  // Sidebar
  const [sidebarAberta, setSidebarAberta] = useState(true);

  // Modal conectar
  const [modalConectar, setModalConectar] = useState(false);
  const [repoInput, setRepoInput] = useState("");

  // Repo aberto
  const [repoAberto, setRepoAberto] = useState<{ owner: string; nome: string } | null>(null);
  const [subAba, setSubAba] = useState<"arquivos" | "branches" | "prs">("arquivos");
  const [branch, setBranch] = useState("main");
  const [arquivoAberto, setArquivoAberto] = useState<string | null>(null);

  // Clone URL
  const [copiado, setCopiado] = useState(false);

  function copiarClone() {
    if (!repoAberto) return;
    navigator.clipboard.writeText(`https://github.com/${repoAberto.owner}/${repoAberto.nome}.git`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function conectar() {
    const parsed = parsearRepo(repoInput);
    if (parsed) {
      conectarRepo(parsed.owner, parsed.nome);
      setModalConectar(false);
      setRepoInput("");
    }
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--tf-bg)" }}>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => {}}
          aberta={sidebarAberta}
          onToggle={() => setSidebarAberta(!sidebarAberta)}
        />
        <main className="flex-1 overflow-auto p-6">
          {!repoAberto ? (
            /* ═══ LISTA DE REPOS ═══ */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => router.push(`/workspace/${workspaceId}`)}
                      className="text-[12px] font-medium transition-smooth hover:underline"
                      style={{ color: "var(--tf-text-tertiary)" }}
                    >
                      {workspace?.nome || "Workspace"}
                    </button>
                    <span style={{ color: "var(--tf-text-tertiary)" }}>/</span>
                    <span className="text-[12px] font-semibold" style={{ color: "var(--tf-text-secondary)" }}>Repositórios</span>
                  </div>
                  <h1 className="text-xl font-bold" style={{ color: "var(--tf-text)" }}>Repositórios</h1>
                  <p className="text-[13px] mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
                    Conecte repositórios GitHub para navegar arquivos, branches e pull requests
                  </p>
                </div>
                <button
                  onClick={() => setModalConectar(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-smooth hover:opacity-90"
                  style={{ background: "var(--tf-accent)" }}
                >
                  <Plus size={16} /> Conectar
                </button>
              </div>

              {/* Lista */}
              {repositorios.length === 0 ? (
                <div className="text-center py-20 rounded-xl border" style={{ borderColor: "var(--tf-border)", background: "var(--tf-surface)" }}>
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--tf-accent-light)" }}>
                    <GitBranch size={28} style={{ color: "var(--tf-accent-text)" }} />
                  </div>
                  <p className="text-base font-semibold" style={{ color: "var(--tf-text)" }}>Nenhum repositório conectado</p>
                  <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: "var(--tf-text-tertiary)" }}>
                    Conecte um repositório GitHub para navegar por arquivos, ver branches e acompanhar pull requests
                  </p>
                  <button
                    onClick={() => setModalConectar(true)}
                    className="mt-5 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-smooth hover:opacity-90"
                    style={{ background: "var(--tf-accent)" }}
                  >
                    Conectar repositório
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {repositorios.map((repo) => (
                    <RepoCard
                      key={repo.id}
                      owner={repo.owner}
                      nome={repo.nome}
                      onAbrir={() => {
                        setRepoAberto({ owner: repo.owner, nome: repo.nome });
                        setBranch("main");
                        setArquivoAberto(null);
                        setSubAba("arquivos");
                      }}
                      onDesconectar={() => desconectarRepo(repo.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ═══ REPO ABERTO ═══ */
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Header do repo */}
              <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "var(--tf-border)" }}>
                <button
                  onClick={() => { setRepoAberto(null); setArquivoAberto(null); }}
                  className="p-1.5 rounded-lg transition-smooth hover:opacity-70"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  <ArrowLeft size={18} />
                </button>
                <GitBranch size={20} style={{ color: "var(--tf-accent)" }} />
                <h2 className="text-lg font-bold" style={{ color: "var(--tf-text)" }}>
                  {repoAberto.owner}<span style={{ color: "var(--tf-text-tertiary)" }}>/</span>{repoAberto.nome}
                </h2>
                <div className="ml-auto flex items-center gap-2">
                  {/* Clone button */}
                  <button
                    onClick={copiarClone}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-smooth border"
                    style={{ color: "var(--tf-text-secondary)", borderColor: "var(--tf-border)", background: "var(--tf-surface)" }}
                  >
                    {copiado ? <Check size={12} /> : <Copy size={12} />}
                    {copiado ? "Copiado!" : "Clone"}
                  </button>
                  {/* Link GitHub */}
                  <a
                    href={`https://github.com/${repoAberto.owner}/${repoAberto.nome}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-smooth border"
                    style={{ color: "var(--tf-text-secondary)", borderColor: "var(--tf-border)", background: "var(--tf-surface)" }}
                  >
                    <ExternalLink size={12} /> GitHub
                  </a>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 border-b" style={{ borderColor: "var(--tf-border)" }}>
                {([
                  { id: "arquivos" as const, label: "Arquivos", icon: Code },
                  { id: "branches" as const, label: "Branches", icon: GitBranch },
                  { id: "prs" as const, label: "Pull Requests", icon: GitFork },
                ]).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setSubAba(id); setArquivoAberto(null); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-smooth border-b-2"
                    style={{
                      borderColor: subAba === id ? "var(--tf-accent)" : "transparent",
                      color: subAba === id ? "var(--tf-accent-text)" : "var(--tf-text-tertiary)",
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              {subAba === "arquivos" && (
                arquivoAberto ? (
                  <RepoFileViewer
                    owner={repoAberto.owner}
                    nome={repoAberto.nome}
                    path={arquivoAberto}
                    branch={branch}
                    onVoltar={() => setArquivoAberto(null)}
                  />
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--tf-text-tertiary)" }}>Branch:</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}>
                        {branch}
                      </span>
                    </div>
                    <RepoFileBrowser
                      owner={repoAberto.owner}
                      nome={repoAberto.nome}
                      branch={branch}
                      onAbrirArquivo={(path) => setArquivoAberto(path)}
                    />
                  </div>
                )
              )}

              {subAba === "branches" && (
                <RepoBranches
                  owner={repoAberto.owner}
                  nome={repoAberto.nome}
                  defaultBranch="main"
                  branchAtiva={branch}
                  onTrocarBranch={(b) => { setBranch(b); setSubAba("arquivos"); setArquivoAberto(null); }}
                />
              )}

              {subAba === "prs" && (
                <RepoPRs owner={repoAberto.owner} nome={repoAberto.nome} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal: Conectar Repositório */}
      <Modal aberto={modalConectar} onFechar={() => { setModalConectar(false); setRepoInput(""); }} titulo="Conectar repositório">
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>URL ou owner/repo</label>
            <input
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="https://github.com/owner/repo ou owner/repo"
              className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
              style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
              onKeyDown={(e) => { if (e.key === "Enter") conectar(); }}
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
              Ex: luisf2907/open-chat ou https://github.com/luisf2907/open-chat
            </p>
          </div>

          {repoInput && parsearRepo(repoInput) && (
            <div className="p-3 rounded-lg border" style={{ background: "var(--tf-bg-secondary)", borderColor: "var(--tf-border)" }}>
              <div className="flex items-center gap-2">
                <GitBranch size={16} style={{ color: "var(--tf-accent)" }} />
                <span className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>
                  {parsearRepo(repoInput)!.owner}/{parsearRepo(repoInput)!.nome}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={conectar}
            disabled={!repoInput || !parsearRepo(repoInput)}
            className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-smooth disabled:opacity-40 hover:opacity-90"
            style={{ background: "var(--tf-accent)" }}
          >
            Conectar
          </button>
        </div>
      </Modal>
    </div>
  );
}
