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
import { RepoWebhookConfig } from "@/components/workspace/repo-webhook-config";
import { useColunas } from "@/hooks/use-colunas";
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
  Loader2,
  Lock,
  Search,
  Settings2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Repositorio } from "@/types/github";

// ─── Webhook Config Inline ───
function WebhookConfigInline({ repoDb }: { repoDb: Repositorio }) {
  // Pegar colunas de algum quadro — usar o primeiro que existir
  // Para isso precisaríamos do quadroId, mas como simplificação vamos usar colunas vazias
  // e deixar o user mapear depois
  const { colunas } = useColunas("");

  return (
    <div className="max-w-xl rounded-xl p-5" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}>
      <RepoWebhookConfig
        repoId={repoDb.id}
        colunas={colunas}
        webhookSecret={repoDb.webhook_secret ?? null}
        colunaReviewId={repoDb.coluna_review_id ?? null}
        colunaDoneId={repoDb.coluna_done_id ?? null}
        colunaDoingId={repoDb.coluna_doing_id ?? null}
        onSalvar={() => {}}
      />
    </div>
  );
}

// ─── Modal Conectar Repo (com listagem autenticada) ───
function ModalConectarRepoLocal({
  aberto, onFechar, repositorios, onConectar,
}: {
  aberto: boolean; onFechar: () => void; repositorios: Repositorio[];
  onConectar: (owner: string, nome: string) => void;
}) {
  const [ghRepos, setGhRepos] = useState<
    { id: number; name: string; full_name: string; description: string | null; private: boolean; language: string | null; owner: string }[]
  >([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<"lista" | "manual">("lista");
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    setErro(null);
    fetch("/api/repos")
      .then((res) => res.json())
      .then((data) => {
        if (data.repos) setGhRepos(data.repos);
        else if (data.error) { setErro(data.error); setModo("manual"); }
      })
      .catch(() => { setErro("Erro ao carregar"); setModo("manual"); })
      .finally(() => setCarregando(false));
  }, [aberto]);

  const jaConectados = new Set(repositorios.map((r) => `${r.owner}/${r.nome}`));
  const filtrados = ghRepos.filter((r) => {
    if (jaConectados.has(r.full_name)) return false;
    if (!busca) return true;
    return r.full_name.toLowerCase().includes(busca.toLowerCase());
  });

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Conectar repositório" className="max-w-md">
      <div className="space-y-3">
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--tf-bg-secondary)" }}>
          {(["lista", "manual"] as const).map((m) => (
            <button key={m} onClick={() => setModo(m)}
              className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-smooth"
              style={{
                background: modo === m ? "var(--tf-surface)" : "transparent",
                color: modo === m ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                boxShadow: modo === m ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}
            >{m === "lista" ? "Meus Repos" : "Manual"}</button>
          ))}
        </div>

        {modo === "lista" ? (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-text-tertiary)" }} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar repositório..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none" style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }} />
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-1" style={{ scrollbarWidth: "thin" }}>
              {carregando ? (
                <div className="flex items-center justify-center py-8 gap-2" style={{ color: "var(--tf-text-tertiary)" }}>
                  <Loader2 size={16} className="animate-spin" /><span className="text-xs">Carregando...</span>
                </div>
              ) : filtrados.length === 0 ? (
                <p className="text-center py-6 text-xs" style={{ color: "var(--tf-text-tertiary)" }}>
                  {busca ? "Nenhum repo encontrado" : "Todos já conectados"}
                </p>
              ) : filtrados.map((r) => (
                <button key={r.id} onClick={() => onConectar(r.owner, r.name)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-smooth group"
                  style={{ border: "1px solid transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tf-bg-secondary)"; e.currentTarget.style.borderColor = "var(--tf-border)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: "var(--tf-accent-light)" }}>
                    <GitBranch size={14} style={{ color: "var(--tf-accent)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--tf-text)" }}>{r.full_name}</span>
                      {r.private && <Lock size={11} style={{ color: "var(--tf-text-tertiary)" }} />}
                    </div>
                    {r.description && <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>{r.description}</p>}
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100" style={{ background: "var(--tf-accent)", color: "#fff" }}>
                    Conectar
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <input value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder="owner/repo ou URL do GitHub"
              className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
              onKeyDown={(e) => { if (e.key === "Enter") { const p = parsearRepo(manualInput); if (p) onConectar(p.owner, p.nome); } }} />
            <button onClick={() => { const p = parsearRepo(manualInput); if (p) onConectar(p.owner, p.nome); }}
              disabled={!manualInput || !parsearRepo(manualInput)}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-40" style={{ background: "var(--tf-accent)" }}>
              Conectar
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

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
  const [subAba, setSubAba] = useState<"arquivos" | "branches" | "prs" | "webhook">("arquivos");
  const [branch, setBranch] = useState("main");
  const [arquivoAberto, setArquivoAberto] = useState<string | null>(null);
  const [caminhoNavegacao, setCaminhoNavegacao] = useState("");

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
                        setCaminhoNavegacao("");
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
                  { id: "webhook" as const, label: "Webhook", icon: Settings2 },
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
                    onVoltar={() => {
                      // Voltar pra pasta do arquivo, não pra raiz
                      const partes = arquivoAberto.split("/");
                      partes.pop(); // remove o nome do arquivo
                      setCaminhoNavegacao(partes.join("/"));
                      setArquivoAberto(null);
                    }}
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
                      caminhoAtual={caminhoNavegacao}
                      onCaminhoChange={setCaminhoNavegacao}
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

              {subAba === "prs" && (() => {
                const repoDb = repositorios.find(
                  (r) => r.owner === repoAberto.owner && r.nome === repoAberto.nome
                );
                return (
                  <RepoPRs
                    owner={repoAberto.owner}
                    nome={repoAberto.nome}
                    repoId={repoDb?.id}
                  />
                );
              })()}

              {subAba === "webhook" && (() => {
                const repoDb = repositorios.find(
                  (r) => r.owner === repoAberto.owner && r.nome === repoAberto.nome
                );
                if (!repoDb) return null;
                return (
                  <WebhookConfigInline repoDb={repoDb} />
                );
              })()}
            </div>
          )}
        </main>
      </div>

      <ModalConectarRepoLocal
        aberto={modalConectar}
        onFechar={() => setModalConectar(false)}
        repositorios={repositorios}
        onConectar={(owner, nome) => {
          conectarRepo(owner, nome);
          setModalConectar(false);
        }}
      />
    </div>
  );
}
