"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { useSidebar } from "@/hooks/use-sidebar";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useBacklog, CartaoBacklog } from "@/hooks/use-backlog";
import { useEtiquetasWorkspace } from "@/hooks/use-etiquetas-workspace";
import { useMembrosWorkspace } from "@/hooks/use-membros-workspace";
import { useRepositorios } from "@/hooks/use-repositorios";
import { useGitHubRepo } from "@/hooks/use-github";
import { parsearRepo } from "@/lib/github/client";
import { CartaoComResumo } from "@/hooks/use-cartoes";
const DetalheCartao = dynamic(
  () => import("@/components/quadro/detalhe-cartao").then((m) => m.DetalheCartao),
  { ssr: false }
);
import dynamic from "next/dynamic";

// Lazy load: componentes pesados de Repos (so usados na sub-pagina /repos)
const RepoFileBrowser = dynamic(() => import("@/components/workspace/repo-file-browser").then((m) => m.RepoFileBrowser), { ssr: false });
const RepoFileViewer = dynamic(() => import("@/components/workspace/repo-file-viewer").then((m) => m.RepoFileViewer), { ssr: false });
const RepoBranches = dynamic(() => import("@/components/workspace/repo-branches").then((m) => m.RepoBranches), { ssr: false });
const RepoPRs = dynamic(() => import("@/components/workspace/repo-prs").then((m) => m.RepoPRs), { ssr: false });
const RepoWebhookConfig = dynamic(() => import("@/components/workspace/repo-webhook-config").then((m) => m.RepoWebhookConfig), { ssr: false });

// Lazy load: componentes de abas (so carregam quando usuario clica na aba)
const MetricasWorkspace = dynamic(() => import("@/components/workspace/metricas").then((m) => m.MetricasWorkspace), { ssr: false });
const TimelineView = dynamic(() => import("@/components/workspace/timeline-view").then((m) => m.TimelineView), { ssr: false });
const AutomacoesConfig = dynamic(() => import("@/components/workspace/automacoes-config").then((m) => m.AutomacoesConfig), { ssr: false });
const AtividadesFeed = dynamic(() => import("@/components/workspace/atividades-feed"), { ssr: false });

// Lazy load: modais pesados
const PlanningPokerModal = dynamic(
  () => import("@/components/planning-poker/planning-poker-modal").then((m) => m.PlanningPokerModal),
  { ssr: false }
);
const GerarCardsModal = dynamic(
  () => import("@/components/ai/gerar-cards-modal").then((m) => m.GerarCardsModal),
  { ssr: false }
);
const ImportarModalDynamic = dynamic(
  () => import("@/components/workspace/importar-modal").then((m) => m.ImportarModal),
  { ssr: false }
);
import { useRealtimeWorkspace } from "@/hooks/use-realtime";
import { supabase } from "@/lib/supabase/client";
import { useColunas } from "@/hooks/use-colunas";
import { usePRSync } from "@/hooks/use-pr-sync";
import { useWorkspaceUsuarios } from "@/hooks/use-workspace-usuarios";
import { Users, Mail, Shield, Crown, UserMinus, Activity } from "lucide-react";
import { Quadro, StatusSprint } from "@/types";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  Calendar,
  ChevronRight,
  Folder,
  Kanban,
  Gauge,
  GripVertical,
  Inbox,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  CheckCircle2,
  Clock,
  Target,
  Trash2,
  Settings,
  ArrowRight,
  BarChart3,
  GitBranch,
  Link2,
  Copy,
  Download,
  ExternalLink,
  X,
  Zap,
  Layers,
  Sparkles,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Lock, Search, Upload } from "lucide-react";
import type { Repositorio } from "@/types/github";
import { exportCSV, exportJSON } from "@/lib/export";
import { Tooltip } from "@/components/ui/tooltip";
import { diasRestantes, formatarDataISO as formatarData } from "@/lib/datas";

// ─── Export Dropdown ───
function ExportDropdown({ cartoes, nomeWorkspace }: { cartoes: import("@/hooks/use-backlog").CartaoBacklog[]; nomeWorkspace: string }) {
  const [aberto, setAberto] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function handleToggle() {
    if (!aberto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 - 65 });
    }
    setAberto(!aberto);
  }

  function handleExport(tipo: "csv" | "json") {
    if (tipo === "csv") exportCSV(cartoes, `${nomeWorkspace}-export.csv`);
    else exportJSON(cartoes, `${nomeWorkspace}-export.json`);
    setAberto(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex items-center gap-2 px-4 py-3 text-[13px] font-bold rounded-[20px] border transition-all hover:-translate-y-0.5"
        style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-secondary)", background: "var(--tf-surface)" }}
      >
        <Download size={16} /> Exportar
      </button>

      {aberto && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setAberto(false)} />
          <div
            className="fixed rounded-[12px] border z-[70] overflow-hidden"
            style={{
              top: pos.top,
              left: pos.left,
              width: 130,
              background: "var(--tf-surface-raised)",
              borderColor: "var(--tf-border)",
              boxShadow: "var(--tf-shadow-md)",
            }}
          >
            <button
              onClick={() => handleExport("csv")}
              className="block w-full px-4 py-2.5 text-[13px] font-semibold text-left"
              style={{ color: "var(--tf-text)", borderBottom: "1px solid var(--tf-border-subtle)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              CSV
            </button>
            <button
              onClick={() => handleExport("json")}
              className="block w-full px-4 py-2.5 text-[13px] font-semibold text-left"
              style={{ color: "var(--tf-text)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              JSON
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ─── Invite Link Inline ───
function InviteLinkInline({ workspaceId }: { workspaceId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function gerarLink() {
    setGerando(true);
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 12; i++) code += chars[Math.floor(Math.random() * chars.length)];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGerando(false); return; }

    const { error } = await supabase.from("invite_links").insert({
      code,
      workspace_id: workspaceId,
      criado_por: user.id,
    });

    if (!error) setLink(`${window.location.origin}/convite/${code}`);
    setGerando(false);
  }

  async function copiar() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="mb-4 pb-4" style={{ borderBottom: "1px solid var(--tf-border-subtle)" }}>
      <p className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--tf-text-tertiary)" }}>
        <Link2 size={11} /> Ou compartilhe um link de convite
      </p>
      {link ? (
        <div className="flex gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 px-2.5 py-1.5 rounded-[6px] text-[11px] font-mono outline-none min-w-0"
            style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)", color: "var(--tf-text-secondary)" }}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copiar}
            className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold shrink-0"
            style={{ background: copiado ? "var(--tf-success-bg)" : "var(--tf-accent)", color: copiado ? "var(--tf-success)" : "#fff" }}
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
      ) : (
        <button
          onClick={gerarLink}
          disabled={gerando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[11px] font-semibold border transition-all"
          style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-secondary)" }}
        >
          {gerando ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
          Gerar link (expira em 7 dias)
        </button>
      )}
    </div>
  );
}

// ─── Modal Conectar Repo (com listagem autenticada) ───
function ModalConectarRepo({
  aberto,
  onFechar,
  repoInput,
  setRepoInput,
  repositorios,
  onConectar,
}: {
  aberto: boolean;
  onFechar: () => void;
  repoInput: string;
  setRepoInput: (v: string) => void;
  repositorios: Repositorio[];
  onConectar: (owner: string, nome: string) => void;
}) {
  const [ghRepos, setGhRepos] = useState<
    { id: number; name: string; full_name: string; description: string | null; private: boolean; language: string | null; owner: string; stars: number }[]
  >([]);
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
  const jaConectados = new Set(repositorios.map((r) => `${r.owner}/${r.nome}`));
  const filtrados = ghRepos.filter((r) => {
    if (jaConectados.has(r.full_name)) return false;
    if (!repoInput) return true;
    return r.full_name.toLowerCase().includes(repoInput.toLowerCase());
  });

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Conectar repositório" className="max-w-md">
      <div className="space-y-3">
        {/* Toggle modo */}
        <div className="flex gap-1 p-0.5 rounded-[8px]" style={{ background: "var(--tf-bg-secondary)" }}>
          <button
            onClick={() => setModo("lista")}
            className="flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-smooth"
            style={{
              background: modo === "lista" ? "var(--tf-surface)" : "transparent",
              color: modo === "lista" ? "var(--tf-text)" : "var(--tf-text-tertiary)",
              boxShadow: modo === "lista" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Meus Repos
          </button>
          <button
            onClick={() => setModo("manual")}
            className="flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-smooth"
            style={{
              background: modo === "manual" ? "var(--tf-surface)" : "transparent",
              color: modo === "manual" ? "var(--tf-text)" : "var(--tf-text-tertiary)",
              boxShadow: modo === "manual" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
            }}
          >
            Manual
          </button>
        </div>

        {modo === "lista" ? (
          <>
            {/* Busca */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-text-tertiary)" }} />
              <input
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="Buscar repositório..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-[8px] outline-none transition-smooth"
                style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
              />
            </div>

            {/* Lista */}
            <div className="max-h-[320px] overflow-y-auto space-y-1 -mx-1 px-1" style={{ scrollbarWidth: "thin" }}>
              {carregando ? (
                <div className="flex items-center justify-center py-8 gap-2" style={{ color: "var(--tf-text-tertiary)" }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">Carregando repositórios...</span>
                </div>
              ) : erro ? (
                <div className="text-center py-6">
                  <p className="text-xs" style={{ color: "var(--tf-text-tertiary)" }}>{erro}</p>
                </div>
              ) : filtrados.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs" style={{ color: "var(--tf-text-tertiary)" }}>
                    {repoInput ? "Nenhum repo encontrado" : "Todos os repos já foram conectados"}
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
                      e.currentTarget.style.background = "var(--tf-bg-secondary)";
                      e.currentTarget.style.borderColor = "var(--tf-border)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                  >
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: "var(--tf-accent-light)" }}>
                      <GitBranch size={14} style={{ color: "var(--tf-accent)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold truncate" style={{ color: "var(--tf-text)" }}>
                          {r.full_name}
                        </span>
                        {r.private && (
                          <Lock size={11} style={{ color: "var(--tf-text-tertiary)" }} />
                        )}
                      </div>
                      {r.description && (
                        <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
                          {r.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {r.language && (
                          <span className="text-[10px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>
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
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>URL ou owner/repo</label>
              <input
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="https://github.com/owner/repo ou owner/repo"
                className="w-full px-3 py-2 text-sm rounded-[8px] outline-none transition-smooth"
                style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const parsed = parsearRepo(repoInput);
                    if (parsed) onConectar(parsed.owner, parsed.nome);
                  }
                }}
              />
              <p className="text-[11px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
                Cole a URL do GitHub ou digite owner/repo
              </p>
            </div>

            {repoInput && parsearRepo(repoInput) && (
              <div className="p-3 rounded-[8px] border" style={{ background: "var(--tf-bg-secondary)", borderColor: "var(--tf-border)" }}>
                <div className="flex items-center gap-2">
                  <GitBranch size={16} style={{ color: "var(--tf-accent)" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>
                    {parsearRepo(repoInput)!.owner}/{parsearRepo(repoInput)!.nome}
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

const CORES_QUADRO = [
  "#C4841D", "#3D8B37", "#B04632", "#2E86AB",
  "#89609E", "#CD5A91", "#00857C", "#D4732A",
];

// ─── Webhook Config Wrapper ───
function WebhookConfigWrapper({ repoId, repoDb, sprintId, workspaceId }: { repoId: string; repoDb: { webhook_secret?: string | null; coluna_review_id?: string | null; coluna_done_id?: string | null; coluna_doing_id?: string | null }; sprintId: string | undefined; workspaceId: string }) {
  const { colunas } = useColunas(sprintId ?? "");

  return (
    <div className="max-w-xl rounded-[14px] p-5" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}>
      {!sprintId ? (
        <p className="text-xs" style={{ color: "var(--tf-text-secondary)" }}>
          Crie um sprint primeiro para poder configurar as colunas do webhook.
        </p>
      ) : (
        <RepoWebhookConfig
          repoId={repoId}
          workspaceId={workspaceId}
          colunas={colunas}
          webhookSecret={repoDb.webhook_secret ?? null}
          colunaReviewId={repoDb.coluna_review_id ?? null}
          colunaDoneId={repoDb.coluna_done_id ?? null}
          colunaDoingId={repoDb.coluna_doing_id ?? null}
          onSalvar={() => {}}
        />
      )}
    </div>
  );
}

// ─── Repo Card ───
function RepoCard({ owner, nome, onAbrir, onDesconectar }: { owner: string; nome: string; onAbrir: () => void; onDesconectar: () => void }) {
  const { repo, carregando } = useGitHubRepo(owner, nome);

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-[14px] border transition-smooth cursor-pointer group"
      style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
      onClick={onAbrir}
    >
      <div className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: "var(--tf-accent-light)" }}>
        <GitBranch size={20} style={{ color: "var(--tf-accent-text)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "var(--tf-text)" }}>{owner}/{nome}</p>
        {carregando ? (
          <div className="h-3 w-48 rounded mt-1 animate-pulse" style={{ background: "var(--tf-border)" }} />
        ) : repo ? (
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
            {repo.description || "Sem descrição"}
            {repo.language && <span className="ml-2 font-medium" style={{ color: "var(--tf-text-secondary)" }}>{repo.language}</span>}
          </p>
        ) : (
          <p className="text-xs mt-0.5" style={{ color: "var(--tf-danger)" }}>Repositório não encontrado</p>
        )}
      </div>
      {repo && (
        <div className="flex items-center gap-3 text-xs shrink-0" style={{ color: "var(--tf-text-tertiary)" }}>
          <span>&#9733; {repo.stargazers_count}</span>
          <span>&#8918; {repo.forks_count}</span>
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDesconectar(); }}
        className="p-1.5 rounded-[8px] opacity-0 group-hover:opacity-100 transition-smooth"
        style={{ color: "var(--tf-danger)" }}
        title="Desconectar"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function BacklogRow({
  tarefa, sprints, etiquetas, isLast, onAssociar, onDesassociar, onMover, onExcluir, onClick, onEstimar,
}: {
  tarefa: CartaoBacklog;
  sprints: Quadro[];
  etiquetas: import("@/types").Etiqueta[];
  isLast: boolean;
  onAssociar: (cartaoId: string, quadroId: string) => void;
  onDesassociar: (cartaoId: string, quadroIdOriginal: string) => void;
  onMover: (cartaoId: string, quadroIdOriginal: string, quadroIdNovo: string) => void;
  onExcluir: (cartaoId: string) => void;
  onClick: () => void;
  onEstimar?: (cartaoId: string) => void;
}) {
  const [seletor, setSeletor] = useState(false);
  const noSprint = !tarefa.coluna_id;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `backlog-${tarefa.id}`,
    data: { tarefa },
  });

  // Etiquetas do cartão (usa etiqueta_ids da junction table)
  const etiquetasDoCartao = etiquetas.filter((e) =>
    tarefa.etiqueta_ids?.includes(e.id)
  );

  return (
    <div
      ref={setDragRef}
      className={`flex items-center gap-3 px-5 py-3 rounded-[14px] transition-all duration-300 ease-out group cursor-pointer border hover:-translate-y-0.5 ${isDragging ? "opacity-30 scale-95" : ""}`}
      style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
      onClick={onClick}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0"
        style={{ color: "var(--tf-text-tertiary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </button>

      {/* Título + etiquetas */}
      <div className="flex-1 min-w-0">
        <span className="text-[13px] truncate block" style={{ color: "var(--tf-text)" }}>
          {tarefa.titulo}
        </span>
        {etiquetasDoCartao.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {etiquetasDoCartao.map((e) => (
              <span key={e.id} className="px-1.5 py-[1px] rounded text-[9px] font-bold text-white" style={{ backgroundColor: e.cor }}>
                {e.nome}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status (coluna) */}
      {tarefa.coluna_nome && (
        <span className="text-[11px] px-2 py-0.5 rounded-[8px] shrink-0" style={{
          background: tarefa.concluido ? "var(--tf-success-bg)" : "var(--tf-bg-secondary)",
          color: tarefa.concluido ? "var(--tf-success)" : "var(--tf-text-tertiary)",
          fontWeight: tarefa.concluido ? 600 : 400,
        }}>
          {tarefa.concluido ? "Concluído" : tarefa.coluna_nome}
        </span>
      )}

      {/* Peso */}
      {tarefa.peso && (
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}>
          <Zap size={9} className="inline mr-0.5" />{tarefa.peso}
        </span>
      )}

      {/* Sprint associada ou seletor */}
      {seletor ? (
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <select
            className="text-[12px] px-2 py-1 rounded-[8px] outline-none"
            style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onAssociar(tarefa.id, e.target.value);
              setSeletor(false);
            }}
            autoFocus
          >
            <option value="" disabled>Escolher sprint...</option>
            {sprints.filter((s) => s.status_sprint !== "concluida").map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
          <button onClick={() => setSeletor(false)} className="p-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
            <X size={14} />
          </button>
        </div>
      ) : noSprint ? (
        <button
          onClick={(e) => { e.stopPropagation(); setSeletor(true); }}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[8px] opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
          style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}
        >
          <ArrowRight size={10} /> Mover pra sprint
        </button>
      ) : (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => e.stopPropagation()}>
          <select
            className="text-[11px] px-1.5 py-0.5 rounded-[8px] outline-none transition-smooth"
            style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)", color: "var(--tf-text-secondary)" }}
            defaultValue=""
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__remover__") {
                if (tarefa.quadro_id) onDesassociar(tarefa.id, tarefa.quadro_id);
              } else if (val && tarefa.quadro_id) {
                onMover(tarefa.id, tarefa.quadro_id, val);
              }
              e.target.value = "";
            }}
          >
            <option value="" disabled>Mover...</option>
            {sprints.filter((s) => s.status_sprint !== "concluida" && s.id !== tarefa.quadro_id).map((s) => (
              <option key={s.id} value={s.id}>→ {s.nome}</option>
            ))}
            <option value="__remover__">Remover da sprint</option>
          </select>
        </div>
      )}

      {/* Estimar com Poker */}
      {onEstimar && (
        <button
          onClick={(e) => { e.stopPropagation(); onEstimar(tarefa.id); }}
          className="p-1 rounded-[8px] opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
          style={{ color: "var(--tf-text-tertiary)" }}
          title="Estimar com Planning Poker"
        >
          <Layers size={13} />
        </button>
      )}

      {/* Excluir */}
      <button
        onClick={(e) => { e.stopPropagation(); onExcluir(tarefa.id); }}
        className="p-1 rounded-[8px] opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
        style={{ color: "var(--tf-text-tertiary)" }}
        title="Excluir tarefa"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function BacklogPuroDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "backlog-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className="rounded-[14px] transition-all duration-200 min-h-[80px]"
      style={{
        padding: isOver ? "12px" : "0",
        border: isOver ? "2px solid var(--tf-accent)" : "2px solid transparent",
        background: isOver ? "var(--tf-accent-light)" : "transparent",
      }}
    >
      {children}
    </div>
  );
}

function SprintDropZone({ sprintId, sprintNome, cor, children }: {
  sprintId: string;
  sprintNome: string;
  cor: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-drop-${sprintId}`,
    data: { sprintId },
  });

  return (
    <div
      ref={setNodeRef}
      className="rounded-[14px] transition-all duration-200 min-h-[80px]"
      style={{
        padding: isOver ? "12px" : "0",
        border: isOver ? `2px solid ${cor}` : "2px solid transparent",
        background: isOver ? `${cor}15` : "transparent",
      }}
    >
      {children}
    </div>
  );
}

export default function PaginaWorkspace() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.id as string;

  const { workspaces, atualizar: atualizarWs, excluir: excluirWs } = useWorkspaces();
  const { quadros, criar: criarQuadro, atualizar: atualizarQuadro, excluir: excluirQuadro } = useQuadros();
  const { cartoes: todosCartoes, backlogPuro, cartoesDaSprint, criarTarefa, associarASprint, desassociarDeSprint, moverParaSprint, excluirTarefa, buscar: buscarBacklog } = useBacklog(workspaceId);
  const { etiquetas: etiquetasWs, criar: criarEtiquetaWs, excluir: excluirEtiquetaWs } = useEtiquetasWorkspace(workspaceId);
  const { membros: membrosWs, criar: criarMembroWs, excluir: excluirMembroWs } = useMembrosWorkspace(workspaceId);
  const { usuarios: wsUsuarios, convidar: convidarUsuario, remover: removerUsuario, alterarPapel } = useWorkspaceUsuarios(workspaceId);
  const [emailConvite, setEmailConvite] = useState("");
  const [erroConvite, setErroConvite] = useState<string | null>(null);
  const [convidando, setConvidando] = useState(false);

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();
  const [abaAtiva, setAbaAtiva] = useState<"backlog" | "sprints" | "timeline" | "metricas" | "config" | "atividade">("sprints");
  const [confirmExcluirWs, setConfirmExcluirWs] = useState(false);
  const [confirmExcluirSprintId, setConfirmExcluirSprintId] = useState<string | null>(null);
  const [confirmRemoverMembroId, setConfirmRemoverMembroId] = useState<string | null>(null);
  useRealtimeWorkspace(workspaceId);

  // Repositórios
  const { repositorios, conectar: conectarRepo, desconectar: desconectarRepo } = useRepositorios(workspaceId);
  const [modalConectarRepo, setModalConectarRepo] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [repoSelecionado, setRepoSelecionado] = useState<{ owner: string; nome: string } | null>(null);
  const [repoSubAba, setRepoSubAba] = useState<"arquivos" | "branches" | "prs" | "webhook">("arquivos");
  const [repoBranch, setRepoBranch] = useState("main");
  const [repoArquivoAberto, setRepoArquivoAberto] = useState<string | null>(null);
  const [repoCaminho, setRepoCaminho] = useState("");

  // PR Sync — sincroniza PRs do primeiro repo com webhook configurado
  const repoComWebhook = repositorios.find((r) => r.coluna_review_id);
  const { sync: syncPRs, syncing: syncingPRs } = usePRSync(repoComWebhook?.id, !!repoComWebhook);

  // Backlog
  const [novaTarefa, setNovaTarefa] = useState("");
  const [novaTarefaPeso, setNovaTarefaPeso] = useState("");
  const [criandoTarefa, setCriandoTarefa] = useState(false);
  const [cartaoSelecionado, setCartaoSelecionado] = useState<CartaoComResumo | null>(null);
  const [arrastando, setArrastando] = useState<CartaoBacklog | null>(null);

  // Planning Poker
  const [pokerAberto, setPokerAberto] = useState(false);
  const [pokerCartaoId, setPokerCartaoId] = useState<string | null>(null);

  // IA
  const [modalIA, setModalIA] = useState(false);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const tarefa = event.active.data.current?.tarefa as CartaoBacklog | undefined;
    if (tarefa) setArrastando(tarefa);
  }

  function handleDragEnd(event: DragEndEvent) {
    setArrastando(null);
    const { active, over } = event;
    if (!over) return;

    const tarefa = active.data.current?.tarefa as CartaoBacklog | undefined;
    const sprintIdDestino = over.data.current?.sprintId as string | undefined;
    const isBacklogDestino = over.id === "backlog-drop-zone";

    if (!tarefa) return;

    const noBacklog = !tarefa.coluna_id;
    const sprintIdOrigem = tarefa.quadro_id;

    if (sprintIdDestino) {
      if (noBacklog) {
        // Backlog → Sprint
        associarASprint(tarefa.id, sprintIdDestino);
      } else if (sprintIdOrigem && sprintIdOrigem !== sprintIdDestino) {
        // Sprint A → Sprint B
        moverParaSprint(tarefa.id, sprintIdOrigem, sprintIdDestino);
      }
    } else if (isBacklogDestino && !noBacklog && sprintIdOrigem) {
      // Sprint → Backlog
      desassociarDeSprint(tarefa.id, sprintIdOrigem);
    }
  }

  function abrirDetalhe(tarefa: CartaoBacklog) {
    // Converter CartaoBacklog para CartaoComResumo (que o DetalheCartao espera)
    const como: CartaoComResumo = {
      ...tarefa,
      etiqueta_ids: tarefa.etiqueta_ids || [],
      membro_ids: tarefa.membro_ids || [],
      total_checklist_itens: 0,
      total_checklist_concluidos: 0,
      total_anexos: 0,
    };
    setCartaoSelecionado(como);
  }

  // Modal novo sprint
  const [modalSprint, setModalSprint] = useState(false);
  const [modalImport, setModalImport] = useState(false);
  const [sprintNome, setSprintNome] = useState("");
  const [sprintMeta, setSprintMeta] = useState("");
  const [sprintCor, setSprintCor] = useState(CORES_QUADRO[0]);
  const [sprintInicio, setSprintInicio] = useState("");
  const [sprintFim, setSprintFim] = useState("");

  // Config workspace
  const [wsNome, setWsNome] = useState("");
  const [wsDescricao, setWsDescricao] = useState("");
  const [editandoConfig, setEditandoConfig] = useState(false);
  const [editandoColunas, setEditandoColunas] = useState(false);
  const [colunasEdit, setColunasEdit] = useState<string[]>([]);
  const [novaColunaInput, setNovaColunaInput] = useState("");

  const sprintsDoWorkspace = useMemo(
    () => quadros.filter((q) => q.workspace_id === workspaceId),
    [quadros, workspaceId]
  );

  // Buscar todas as colunas de todos os quadros do workspace (para automações)
  const [todasColunas, setTodasColunas] = useState<import("@/types").Coluna[]>([]);
  useEffect(() => {
    if (sprintsDoWorkspace.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("colunas")
        .select("*")
        .in("quadro_id", sprintsDoWorkspace.map((q) => q.id))
        .order("posicao");
      if (data) setTodasColunas(data as import("@/types").Coluna[]);
    })();
  }, [sprintsDoWorkspace]);

  const sprintAtiva = sprintsDoWorkspace.find((q) => q.status_sprint === "ativa");
  const sprintsPlanejadas = sprintsDoWorkspace.filter((q) => q.status_sprint === "planejada");
  const sprintsConcluidas = sprintsDoWorkspace.filter((q) => q.status_sprint === "concluida");

  async function handleCriarSprint() {
    if (!sprintNome.trim()) return;
    const quadro = await criarQuadro({
      nome: sprintNome.trim(),
      cor: sprintCor,
      workspaceId,
      dataInicio: sprintInicio || undefined,
      dataFim: sprintFim || undefined,
      statusSprint: "planejada",
      meta: sprintMeta.trim() || undefined,
    });

    if (quadro && workspace?.colunas_padrao && workspace.colunas_padrao.length > 0) {
      const { supabase } = await import("@/lib/supabase/client");
      const colunas = workspace.colunas_padrao.map((nome, i) => ({
        quadro_id: quadro.id,
        nome,
        posicao: i,
      }));
      await supabase.from("colunas").insert(colunas);
    }

    setModalSprint(false);
    setSprintNome(""); setSprintMeta(""); setSprintInicio(""); setSprintFim("");
    setSprintCor(CORES_QUADRO[0]);

    // Fica na página do workspace após criar
  }

  async function ativarSprint(id: string) {
    // Desativar sprint ativa atual (se houver) e ativar a nova — em paralelo
    const promises: Promise<unknown>[] = [];
    if (sprintAtiva && sprintAtiva.id !== id) {
      promises.push(atualizarQuadro(sprintAtiva.id, { status_sprint: "planejada" }));
    }
    promises.push(atualizarQuadro(id, { status_sprint: "ativa" }));
    await Promise.all(promises);
  }

  async function concluirSprint(id: string) {
    await atualizarQuadro(id, { status_sprint: "concluida" });
  }

  async function handleCriarTarefa() {
    if (!novaTarefa.trim()) return;
    await criarTarefa(novaTarefa.trim(), novaTarefaPeso ? parseInt(novaTarefaPeso) : undefined);
    setNovaTarefa("");
    setNovaTarefaPeso("");
    setCriandoTarefa(false);
  }

  function iniciarEditConfig() {
    if (!workspace) return;
    setWsNome(workspace.nome);
    setWsDescricao(workspace.descricao || "");
    setEditandoConfig(true);
  }

  async function salvarConfig() {
    if (!workspace) return;
    await atualizarWs(workspace.id, {
      nome: wsNome.trim() || workspace.nome,
      descricao: wsDescricao.trim() || null,
    });
    setEditandoConfig(false);
  }

  if (!workspace) {
    return (
      <div className="h-full flex overflow-hidden" style={{ background: "var(--tf-bg)" }}>
        {iniciado && (
          <Sidebar quadros={quadros} onNovoQuadro={() => {}} aberta={sidebarAberta} onToggle={toggleSidebar} />
        )}
        <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
          <Header onMenuMobile={toggleSidebar} />
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--tf-accent)", borderTopColor: "transparent" }} />
          </div>
        </div>
      </div>
    );
  }

  function SprintCard({ sprint, tipo }: { sprint: Quadro; tipo: "ativa" | "planejada" | "concluida" }) {
    const dias = diasRestantes(sprint.data_fim);
    const statusLabel = tipo === "ativa" ? "Ativa" : tipo === "concluida" ? "Concluída" : "Planejada";
    const statusColor = tipo === "ativa" ? "var(--tf-success)" : tipo === "concluida" ? "var(--tf-text-tertiary)" : "var(--tf-warning)";
    const statusBg = tipo === "ativa" ? "var(--tf-success-bg)" : tipo === "concluida" ? "var(--tf-bg-secondary)" : "var(--tf-warning-bg)";

    return (
      <div
        className="group rounded-[20px] p-5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
        style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
        onClick={() => router.push(`/quadro/${sprint.id}`)}
      >
        <div className="flex items-start gap-4">
          {/* Left: icon */}
          <div
            className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: sprint.cor }}
          >
            <Kanban size={18} className="text-white" />
          </div>

          {/* Center: info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[14px] font-bold truncate" style={{ color: "var(--tf-text)" }}>
                {sprint.nome}
              </h3>
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0"
                style={{ background: statusBg, color: statusColor }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                {statusLabel}
              </span>
            </div>

            {sprint.data_inicio && sprint.data_fim && (
              <p className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--tf-text-tertiary)" }}>
                <Calendar size={11} />
                {formatarData(sprint.data_inicio)} → {formatarData(sprint.data_fim)}
                {dias !== null && tipo === "ativa" && (
                  <span
                    className="font-bold"
                    style={{ color: dias <= 2 ? "var(--tf-danger)" : dias <= 5 ? "var(--tf-warning)" : "var(--tf-accent)" }}
                  >
                    · {dias > 0 ? `${dias}d` : dias === 0 ? "Hoje!" : `${Math.abs(dias)}d atrasada`}
                  </span>
                )}
              </p>
            )}

            {sprint.meta && (
              <p className="text-[12px] mt-1.5 leading-relaxed truncate" style={{ color: "var(--tf-text-secondary)" }}>
                {sprint.meta}
              </p>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {tipo === "planejada" && (
              <button
                onClick={() => ativarSprint(sprint.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-full transition-all duration-150 hover:shadow-md"
                style={{ background: "var(--tf-success)" }}
              >
                <Play size={10} /> Ativar
              </button>
            )}
            {tipo === "ativa" && (
              <button
                onClick={() => concluirSprint(sprint.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-full transition-all duration-150 hover:shadow-md"
                style={{ background: "var(--tf-accent)" }}
              >
                <CheckCircle2 size={10} /> Concluir
              </button>
            )}
            <Dropdown
              trigger={
                <button
                  className="p-1.5 rounded-[8px] opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-[var(--tf-surface-hover)]"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  <MoreHorizontal size={16} />
                </button>
              }
            >
              <DropdownItem onClick={() => router.push(`/quadro/${sprint.id}`)}>
                <ArrowRight size={14} /> Abrir board
              </DropdownItem>
              <DropdownItem perigo onClick={() => setConfirmExcluirSprintId(sprint.id)}>
                <Trash2 size={14} /> Excluir sprint
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden" style={{ background: "var(--tf-bg)" }}>
      {iniciado && (
        <Sidebar quadros={quadros} onNovoQuadro={() => setModalSprint(true)} aberta={sidebarAberta} onToggle={toggleSidebar} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header onMenuMobile={toggleSidebar} />
        <main id="main-content" className="flex-1 overflow-y-auto pb-4 no-scrollbar" style={{ background: "transparent" }}>

          {/* GRID ÚNICO — hero + conteúdo alinhados */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* HERO CARD — ocupa toda a largura do grid */}
            <div
              className="col-span-full relative overflow-hidden rounded-[32px] border transition-smooth"
              style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
            >
              <div className="relative z-10 px-8 lg:px-12 pt-10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[20px] flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105" style={{ background: workspace.cor }}>
                    <Folder size={32} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight" style={{ color: "var(--tf-text)" }}>{workspace.nome}</h1>
                    <p className="text-[15px] font-medium mt-2" style={{ color: "var(--tf-text-tertiary)" }}>
                      {workspace.descricao || "Sem descrição"} • {sprintsDoWorkspace.length} sprints totais
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  <ExportDropdown cartoes={todosCartoes} nomeWorkspace={workspace.nome} />
                  <Tooltip content="Importe dados do Trello (JSON) ou Jira (CSV)">
                    <button
                      onClick={() => setModalImport(true)}
                      className="flex items-center gap-2 px-4 py-3 text-[13px] font-bold rounded-[20px] border transition-all hover:-translate-y-0.5"
                      style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-secondary)", background: "var(--tf-surface)" }}
                    >
                      <Upload size={16} /> Importar
                    </button>
                  </Tooltip>
                  <Tooltip content="Crie um novo sprint para organizar tarefas">
                    <button
                      onClick={() => setModalSprint(true)}
                      className="flex items-center gap-2 px-5 py-3 text-[14px] font-bold rounded-[20px] transition-all hover:-translate-y-0.5"
                      style={{ background: "var(--tf-accent-yellow)", color: "#1C2B29" }}
                    >
                      <Plus size={18} strokeWidth={2.5} /> Nova Sprint
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* TABS INTEGRADAS */}
              <div className="relative z-10 flex flex-wrap items-center gap-2 px-8 lg:px-12 pt-4 pb-6 mt-2 border-t" style={{ borderColor: `${workspace.cor}20` }}>
                {[
                  { id: "backlog" as const, label: "Backlog & Quadro", icon: Inbox },
                  { id: "sprints" as const, label: "Sprints", icon: Calendar },
                  { id: "timeline" as const, label: "Timeline", icon: Clock },
                  { id: "metricas" as const, label: "Métricas", icon: BarChart3 },
                  { id: "config" as const, label: "Ajustes", icon: Settings },
                  { id: "atividade" as const, label: "Atividade", icon: Activity },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setAbaAtiva(id)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 text-[14px] font-bold rounded-[14px] transition-all duration-300",
                      abaAtiva === id
                        ? "shadow-[0_4px_12px_rgba(0,0,0,0.08)] scale-105"
                        : "hover:scale-105 hover:-translate-y-0.5"
                    )}
                    style={{
                      background: abaAtiva === id ? "var(--tf-accent-light)" : "transparent",
                      color: abaAtiva === id ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
                    }}
                  >
                    <Icon size={16} strokeWidth={abaAtiva === id ? 2.5 : 2} /> {label}
                  </button>
                ))}
              </div>
            </div>

              {/* COLUNA PRINCIPAL DA ABA (ESQUERDA 75%) */}
              <div className="lg:col-span-8 xl:col-span-9 flex flex-col space-y-6">

            {/* ═══ ABA BACKLOG ═══ */}
            {abaAtiva === "backlog" && (
              <DndContext sensors={dndSensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                {/* Header + Criar */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>
                    Todas as tarefas do workspace
                  </h2>
                  <div className="flex items-center gap-2">
                    {!criandoTarefa && (
                      <button
                        onClick={() => setCriandoTarefa(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white rounded-[8px] transition-smooth"
                        style={{ background: "var(--tf-accent)" }}
                      >
                        <Plus size={14} /> Nova tarefa
                      </button>
                    )}
                    <button
                      onClick={() => { setPokerCartaoId(null); setPokerAberto(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-[8px] transition-smooth border"
                      style={{ borderColor: "var(--tf-border)", color: "var(--tf-text)", background: "var(--tf-surface)" }}
                      title="Planning Poker"
                    >
                      <Layers size={14} /> Poker
                    </button>
                    <button
                      onClick={() => setModalIA(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-[8px] transition-smooth border"
                      style={{ borderColor: "var(--tf-border)", color: "var(--tf-text)", background: "var(--tf-surface)" }}
                      title="Gerar cards com IA"
                    >
                      <Sparkles size={14} style={{ color: "var(--tf-accent)" }} /> IA
                    </button>
                  </div>
                </div>

                {/* Form criar tarefa */}
                {criandoTarefa && (
                  <div className="rounded-[20px] border p-5 space-y-3" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)",  }}>
                    <div className="flex gap-3">
                      <input
                        value={novaTarefa}
                        onChange={(e) => setNovaTarefa(e.target.value)}
                        placeholder="Título da tarefa..."
                        className="flex-1 px-3 py-2 text-sm rounded-[8px] outline-none transition-smooth"
                        style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCriarTarefa(); if (e.key === "Escape") setCriandoTarefa(false); }}
                        autoFocus
                      />
                      <input
                        value={novaTarefaPeso}
                        onChange={(e) => setNovaTarefaPeso(e.target.value.replace(/\D/g, ""))}
                        placeholder="Pts"
                        className="w-16 px-3 py-2 text-sm rounded-[8px] outline-none transition-smooth text-center"
                        style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCriarTarefa} disabled={!novaTarefa.trim()} className="px-4 py-1.5 text-sm font-semibold text-white rounded-[8px] disabled:opacity-40 transition-smooth" style={{ background: "var(--tf-accent)" }}>
                        Criar
                      </button>
                      <button onClick={() => { setCriandoTarefa(false); setNovaTarefa(""); setNovaTarefaPeso(""); }} className="px-4 py-1.5 text-sm rounded-[8px] transition-smooth" style={{ color: "var(--tf-text-secondary)" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Seção: Sem Sprint (backlog puro) — também é drop zone */}
                <BacklogPuroDropZone>
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Inbox size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-secondary)" }}>
                        Sem sprint ({backlogPuro.length})
                      </h3>
                    </div>
                    {backlogPuro.length > 0 ? (
                      <div className="flex flex-col gap-2.5">
                        {backlogPuro.map((tarefa, i) => (
                          <BacklogRow key={tarefa.id} tarefa={tarefa} sprints={sprintsDoWorkspace} etiquetas={etiquetasWs} isLast={i === backlogPuro.length - 1} onAssociar={associarASprint} onDesassociar={desassociarDeSprint} onMover={moverParaSprint} onExcluir={excluirTarefa} onClick={() => abrirDetalhe(tarefa)} onEstimar={(id) => { setPokerCartaoId(id); setPokerAberto(true); }} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[20px] border-2 border-dashed py-6 text-center text-[12px]" style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-tertiary)" }}>
                        Arraste tarefas aqui para remover da sprint
                      </div>
                    )}
                  </section>
                </BacklogPuroDropZone>

                {/* Seções por Sprint */}
                {sprintsDoWorkspace.filter((s) => s.status_sprint !== "concluida").map((sprint) => {
                  const tarefas = cartoesDaSprint(sprint.id);

                  return (
                    <SprintDropZone key={sprint.id} sprintId={sprint.id} sprintNome={sprint.nome} cor={sprint.cor}>
                      <section>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{
                            background: sprint.status_sprint === "ativa" ? "var(--tf-success)" : "var(--tf-warning)"
                          }} />
                          <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-secondary)" }}>
                            {sprint.nome} ({tarefas.length})
                          </h3>
                          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                            {sprint.status_sprint === "ativa" ? "ativa" : "planejada"}
                          </span>
                        </div>
                        {tarefas.length > 0 ? (
                          <div className="flex flex-col gap-2.5">
                            {tarefas.map((tarefa, i) => (
                              <BacklogRow key={tarefa.id} tarefa={tarefa} sprints={sprintsDoWorkspace} etiquetas={etiquetasWs} isLast={i === tarefas.length - 1} onAssociar={associarASprint} onDesassociar={desassociarDeSprint} onMover={moverParaSprint} onExcluir={excluirTarefa} onClick={() => abrirDetalhe(tarefa)} onEstimar={(id) => { setPokerCartaoId(id); setPokerAberto(true); }} />
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-[20px] border-2 border-dashed py-6 text-center text-[12px]" style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-tertiary)" }}>
                            Arraste tarefas do backlog para cá
                          </div>
                        )}
                      </section>
                    </SprintDropZone>
                  );
                })}

                {/* Sprints concluídas (sem drop zone) */}
                {sprintsDoWorkspace.filter((s) => s.status_sprint === "concluida").map((sprint) => {
                  const tarefas = cartoesDaSprint(sprint.id);
                  if (tarefas.length === 0) return null;
                  return (
                    <section key={sprint.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--tf-text-tertiary)" }} />
                        <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-secondary)" }}>
                          {sprint.nome} ({tarefas.length})
                        </h3>
                        <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>concluída</span>
                      </div>
                      <div className="flex flex-col gap-2.5 opacity-80 mix-blend-luminosity">
                        {tarefas.map((tarefa, i) => (
                          <BacklogRow key={tarefa.id} tarefa={tarefa} sprints={sprintsDoWorkspace} etiquetas={etiquetasWs} isLast={i === tarefas.length - 1} onAssociar={associarASprint} onDesassociar={desassociarDeSprint} onMover={moverParaSprint} onExcluir={excluirTarefa} onClick={() => abrirDetalhe(tarefa)} onEstimar={(id) => { setPokerCartaoId(id); setPokerAberto(true); }} />
                        ))}
                      </div>
                    </section>
                  );
                })}

                {/* Empty */}
                {backlogPuro.length === 0 && sprintsDoWorkspace.every((s) => cartoesDaSprint(s.id).length === 0) && (
                  <div className="text-center py-16">
                    <Inbox size={32} className="mx-auto mb-3" style={{ color: "var(--tf-text-tertiary)" }} />
                    <h3 className="text-base font-bold mb-1" style={{ color: "var(--tf-text)" }}>Backlog vazio</h3>
                    <p className="text-sm mb-4" style={{ color: "var(--tf-text-tertiary)" }}>Crie tarefas e depois associe a sprints</p>
                    <button onClick={() => setCriandoTarefa(true)} className="px-4 py-2 text-sm font-semibold text-white rounded-[8px]" style={{ background: "var(--tf-accent)" }}>
                      Criar primeira tarefa
                    </button>
                  </div>
                )}

                {/* Drag overlay */}
                <DragOverlay>
                  {arrastando && (
                    <div
                      className="flex items-center gap-3 px-4 py-2.5 rounded-[14px] border"
                      style={{ background: "var(--tf-surface)", borderColor: "var(--tf-accent)", minWidth: 280 }}
                    >
                      <GripVertical size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[13px] font-medium" style={{ color: "var(--tf-text)" }}>{arrastando.titulo}</span>
                      {arrastando.peso && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-auto" style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}>
                          {arrastando.peso}pts
                        </span>
                      )}
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}

            {/* ═══ ABA SPRINTS ═══ */}
            {abaAtiva === "sprints" && (
              <>
                {/* Sprint Ativa */}
                {sprintAtiva && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-success)" }}>Sprint Ativa</h2>
                    </div>
                    <SprintCard sprint={sprintAtiva} tipo="ativa" />
                  </section>
                )}

                {/* Planejadas */}
                {sprintsPlanejadas.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-secondary)" }}>
                        Planejadas ({sprintsPlanejadas.length})
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {sprintsPlanejadas.map((s) => <SprintCard key={s.id} sprint={s} tipo="planejada" />)}
                    </div>
                  </section>
                )}

                {/* Concluídas */}
                {sprintsConcluidas.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <h2 className="text-[13px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-secondary)" }}>
                        Concluídas ({sprintsConcluidas.length})
                      </h2>
                    </div>
                    <div className="space-y-3">
                      {sprintsConcluidas.map((s) => <SprintCard key={s.id} sprint={s} tipo="concluida" />)}
                    </div>
                  </section>
                )}

                {/* Empty */}
                {sprintsDoWorkspace.length === 0 && (
                  <div className="text-center py-16">
                    <Calendar size={32} className="mx-auto mb-3" style={{ color: "var(--tf-text-tertiary)" }} />
                    <h3 className="text-base font-bold mb-1" style={{ color: "var(--tf-text)" }}>Nenhuma sprint</h3>
                    <p className="text-sm mb-4" style={{ color: "var(--tf-text-tertiary)" }}>Crie sua primeira sprint para começar a planejar</p>
                    <button onClick={() => setModalSprint(true)} className="px-4 py-2 text-sm font-semibold text-white rounded-[8px]" style={{ background: "var(--tf-accent)" }}>
                      Criar sprint
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ═══ ABA TIMELINE ═══ */}
            {abaAtiva === "timeline" && (
              <TimelineView
                sprints={sprintsDoWorkspace}
                cartoesDaSprint={cartoesDaSprint}
                onSprintClick={(id) => router.push(`/quadro/${id}`)}
                workspaceId={workspaceId}
              />
            )}

            {/* ═══ ABA MÉTRICAS ═══ */}
            {abaAtiva === "metricas" && (
              <MetricasWorkspace
                sprints={sprintsDoWorkspace}
                cartoesDaSprint={cartoesDaSprint}
                backlogPuro={backlogPuro}
                etiquetas={etiquetasWs}
                membros={membrosWs}
              />
            )}

            {abaAtiva === "atividade" && (
              <AtividadesFeed workspaceId={workspaceId} />
            )}

            {abaAtiva === "config" && (
              <section className="space-y-6">
                {/* Row 1: Informações + Colunas padrão lado a lado */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>Informações</h3>
                    {!editandoConfig && (
                      <button onClick={iniciarEditConfig} className="flex items-center gap-1 text-[12px] font-medium transition-smooth" style={{ color: "var(--tf-accent-text)" }}>
                        <Pencil size={12} /> Editar
                      </button>
                    )}
                  </div>
                  {editandoConfig ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--tf-text-secondary)" }}>Nome</label>
                        <input value={wsNome} onChange={(e) => setWsNome(e.target.value)} className="w-full px-3 py-2 text-sm rounded-[8px] outline-none" style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-accent)", color: "var(--tf-text)" }} />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--tf-text-secondary)" }}>Descrição</label>
                        <input value={wsDescricao} onChange={(e) => setWsDescricao(e.target.value)} placeholder="Descrição do workspace" className="w-full px-3 py-2 text-sm rounded-[8px] outline-none" style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={salvarConfig} className="px-4 py-1.5 text-sm font-semibold text-white rounded-[8px]" style={{ background: "var(--tf-accent)" }}>Salvar</button>
                        <button onClick={() => setEditandoConfig(false)} className="px-4 py-1.5 text-sm rounded-[8px]" style={{ color: "var(--tf-text-secondary)" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm" style={{ color: "var(--tf-text)" }}><strong>Nome:</strong> {workspace.nome}</p>
                      <p className="text-sm" style={{ color: "var(--tf-text)" }}><strong>Descrição:</strong> {workspace.descricao || "—"}</p>
                      <p className="text-sm" style={{ color: "var(--tf-text)" }}><strong>Sprints:</strong> {sprintsDoWorkspace.length}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>Colunas padrão</h3>
                      <p className="text-[12px] mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>Criadas automaticamente em novas sprints</p>
                    </div>
                    {!editandoColunas && (
                      <button
                        onClick={() => { setColunasEdit([...(workspace.colunas_padrao || [])]); setEditandoColunas(true); }}
                        className="flex items-center gap-1 text-[12px] font-medium transition-smooth"
                        style={{ color: "var(--tf-accent-text)" }}
                      >
                        <Pencil size={12} /> Editar
                      </button>
                    )}
                  </div>

                  {editandoColunas ? (
                    <div className="space-y-2">
                      {colunasEdit.map((col, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            onClick={() => { if (i > 0) { const c = [...colunasEdit]; [c[i-1], c[i]] = [c[i], c[i-1]]; setColunasEdit(c); } }}
                            disabled={i === 0}
                            className="p-1 rounded text-[12px] disabled:opacity-20"
                            style={{ color: "var(--tf-text-tertiary)" }}
                          >↑</button>
                          <button
                            onClick={() => { if (i < colunasEdit.length - 1) { const c = [...colunasEdit]; [c[i], c[i+1]] = [c[i+1], c[i]]; setColunasEdit(c); } }}
                            disabled={i === colunasEdit.length - 1}
                            className="p-1 rounded text-[12px] disabled:opacity-20"
                            style={{ color: "var(--tf-text-tertiary)" }}
                          >↓</button>
                          <span className="flex-1 px-3 py-1.5 text-[13px] rounded-[8px]" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text)" }}>
                            {col}
                          </span>
                          <button
                            onClick={() => setColunasEdit(colunasEdit.filter((_, j) => j !== i))}
                            className="p-1 rounded transition-smooth"
                            style={{ color: "var(--tf-danger)" }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input
                          value={novaColunaInput}
                          onChange={(e) => setNovaColunaInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && novaColunaInput.trim()) {
                              setColunasEdit([...colunasEdit, novaColunaInput.trim()]);
                              setNovaColunaInput("");
                            }
                          }}
                          placeholder="Nova coluna..."
                          className="flex-1 px-3 py-1.5 text-[13px] rounded-[8px] outline-none transition-smooth"
                          style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
                        />
                        <button
                          onClick={() => { if (novaColunaInput.trim()) { setColunasEdit([...colunasEdit, novaColunaInput.trim()]); setNovaColunaInput(""); } }}
                          className="px-3 py-1.5 text-[12px] font-medium rounded-[8px] transition-smooth"
                          style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={async () => { await atualizarWs(workspace.id, { colunas_padrao: colunasEdit }); setEditandoColunas(false); }}
                          className="px-4 py-1.5 text-sm font-semibold text-white rounded-[8px] transition-smooth"
                          style={{ background: "var(--tf-accent)" }}
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => { setEditandoColunas(false); setNovaColunaInput(""); }}
                          className="px-4 py-1.5 text-sm rounded-[8px] transition-smooth"
                          style={{ color: "var(--tf-text-secondary)" }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {workspace.colunas_padrao?.map((col, i) => (
                        <span key={i} className="px-3 py-1.5 text-[12px] font-medium rounded-[8px]" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}>
                          {col}
                        </span>
                      ))}
                      {(!workspace.colunas_padrao || workspace.colunas_padrao.length === 0) && (
                        <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>Nenhuma coluna padrão definida</p>
                      )}
                    </div>
                  )}
                </div>

                </div>{/* Close grid row 1 */}

                {/* ─── Equipe ─── */}
                <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={16} style={{ color: "var(--tf-accent)" }} />
                    <h3 className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>Equipe</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>
                      {wsUsuarios.length} {wsUsuarios.length === 1 ? "membro" : "membros"}
                    </span>
                  </div>

                  {/* Convidar */}
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-text-tertiary)" }} />
                      <input
                        value={emailConvite}
                        onChange={(e) => { setEmailConvite(e.target.value); setErroConvite(null); }}
                        placeholder="Email do membro para convidar..."
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-[8px] outline-none transition-smooth"
                        style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && emailConvite.trim()) {
                            setConvidando(true);
                            setErroConvite(null);
                            const resultado = await convidarUsuario(emailConvite.trim());
                            if (resultado?.error) setErroConvite(resultado.error);
                            else setEmailConvite("");
                            setConvidando(false);
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!emailConvite.trim()) return;
                        setConvidando(true);
                        setErroConvite(null);
                        const resultado = await convidarUsuario(emailConvite.trim());
                        if (resultado?.error) setErroConvite(resultado.error);
                        else setEmailConvite("");
                        setConvidando(false);
                      }}
                      disabled={convidando || !emailConvite.trim()}
                      className="px-4 py-2 text-sm font-semibold text-white rounded-[8px] transition-smooth disabled:opacity-40"
                      style={{ background: "var(--tf-accent)" }}
                    >
                      {convidando ? "..." : "Convidar"}
                    </button>
                  </div>

                  {erroConvite && (
                    <p className="text-xs mb-3 px-3 py-2 rounded-[8px]" style={{ background: "#ef444420", color: "#ef4444" }}>
                      {erroConvite}
                    </p>
                  )}

                  {/* Link de convite */}
                  <InviteLinkInline workspaceId={workspaceId} />

                  {/* Lista de membros */}
                  <div className="space-y-1">
                    {wsUsuarios.length === 0 ? (
                      <p className="text-xs py-4 text-center" style={{ color: "var(--tf-text-tertiary)" }}>
                        Nenhum membro no workspace ainda. Convide alguém pelo email!
                      </p>
                    ) : (
                      wsUsuarios.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] transition-smooth group"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-bg-secondary)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {/* Avatar */}
                          {u.perfis?.avatar_url ? (
                            <img
                              src={u.perfis.avatar_url}
                              alt={u.perfis.nome || ""}
                              className="w-8 h-8 rounded-full shrink-0"
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ background: "var(--tf-accent)" }}
                            >
                              {(u.perfis?.nome || u.perfis?.email || "?").charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--tf-text)" }}>
                              {u.perfis?.nome || u.perfis?.email || "Usuário"}
                              {u.perfis?.github_username && (
                                <span className="text-[11px] ml-1.5 font-normal" style={{ color: "var(--tf-text-tertiary)" }}>
                                  @{u.perfis.github_username}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: "var(--tf-text-tertiary)" }}>
                              {u.perfis?.email || ""}
                            </p>
                          </div>

                          {/* Badge papel */}
                          <span
                            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-[8px] shrink-0"
                            style={{
                              background: u.papel === "admin" ? "var(--tf-accent-light)" : "var(--tf-bg-secondary)",
                              color: u.papel === "admin" ? "var(--tf-accent-text)" : "var(--tf-text-tertiary)",
                            }}
                          >
                            {u.papel === "admin" ? <Crown size={10} /> : <Shield size={10} />}
                            {u.papel === "admin" ? "Admin" : "Membro"}
                          </span>

                          {/* Ações */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                            <button
                              onClick={() => alterarPapel(u.id, u.papel === "admin" ? "membro" : "admin")}
                              className="p-1.5 rounded-[8px] transition-smooth"
                              style={{ color: "var(--tf-text-tertiary)" }}
                              title={u.papel === "admin" ? "Tornar membro" : "Tornar admin"}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-accent)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
                            >
                              <Shield size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmRemoverMembroId(u.id)}
                              className="p-1.5 rounded-[8px] transition-smooth"
                              style={{ color: "var(--tf-text-tertiary)" }}
                              title="Remover do workspace"
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-danger)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
                            >
                              <UserMinus size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Automações */}
                <div className="rounded-[14px] border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                  <AutomacoesConfig
                    workspaceId={workspaceId}
                    colunas={todasColunas}
                    membros={membrosWs}
                    etiquetas={etiquetasWs}
                  />
                </div>

                <div className="rounded-[20px] border p-6 transition-smooth" style={{ background: "var(--tf-danger-bg)", borderColor: "var(--tf-danger)" }}>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--tf-danger)" }}><Trash2 size={16}/> Zona de perigo</h3>
                  <p className="text-[13px] mb-4 font-medium" style={{ color: "var(--tf-danger)" }}>Excluir este workspace. Os quadros/sprints ficarão como avulsos soltos.</p>
                  {!confirmExcluirWs ? (
                    <button
                      onClick={() => setConfirmExcluirWs(true)}
                      className="px-5 py-2.5 text-[13px] font-bold text-white rounded-[14px] transition-smooth hover:-translate-y-0.5" style={{ background: "var(--tf-danger)" }}
                    >
                      Excluir Workspace Permanentemente
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-semibold" style={{ color: "var(--tf-danger)" }}>Confirmar exclusão?</span>
                      <button
                        onClick={async () => { await excluirWs(workspaceId); router.push("/dashboard"); }}
                        className="px-4 py-2 text-[12px] font-bold text-white rounded-[10px]" style={{ background: "var(--tf-danger)" }}
                      >
                        Sim, excluir
                      </button>
                      <button
                        onClick={() => setConfirmExcluirWs(false)}
                        className="px-4 py-2 text-[12px] font-medium rounded-[10px]" style={{ color: "var(--tf-text-secondary)", background: "var(--tf-bg-secondary)" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* COLUNA LATERAL (DIREITA 25%) - SIDEKICK PANEL */}
          <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-5 min-w-0">

            {/* ─── BACKLOG: Sprint Ativa + Equipe ─── */}
            {abaAtiva === "backlog" && (
              <>
                {sprintAtiva && (
                  <div className="rounded-[20px] p-5 border transition-smooth overflow-hidden" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                    <h3 className="text-[11px] font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--tf-success)" }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--tf-success)" }}>
                        <div className="w-2 h-2 rounded-full animate-ping" style={{ background: "var(--tf-success)" }} />
                      </div>
                      Sprint Ativa
                    </h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-2.5 h-8 rounded-full shrink-0" style={{ background: sprintAtiva.cor }} />
                      <div className="min-w-0">
                        <p className="text-[14px] font-bold truncate" style={{ color: "var(--tf-text)" }}>{sprintAtiva.nome}</p>
                        {sprintAtiva.data_inicio && sprintAtiva.data_fim && (
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--tf-text-tertiary)" }}>
                            {formatarData(sprintAtiva.data_inicio)} → {formatarData(sprintAtiva.data_fim)}
                            {(() => { const d = diasRestantes(sprintAtiva.data_fim); return d !== null ? <span className="font-bold ml-1" style={{ color: d <= 2 ? "var(--tf-danger)" : d <= 5 ? "var(--tf-warning)" : "var(--tf-success)" }}>· {d > 0 ? `${d}d` : d === 0 ? "Hoje!" : `${Math.abs(d)}d atrás`}</span> : null; })()}
                          </p>
                        )}
                      </div>
                    </div>
                    {sprintAtiva.meta && (
                      <p className="text-[11px] mb-3 leading-relaxed line-clamp-2 pl-[22px]" style={{ color: "var(--tf-text-secondary)" }}>{sprintAtiva.meta}</p>
                    )}
                    {/* Mini progress */}
                    {(() => {
                      const tarefas = cartoesDaSprint(sprintAtiva.id);
                      const total = tarefas.length;
                      const pct = total > 0 ? Math.round((tarefas.filter(t => t.coluna_nome?.toLowerCase().includes("conclu") || t.coluna_nome?.toLowerCase().includes("done")).length / total) * 100) : 0;
                      return total > 0 ? (
                        <div className="pl-[22px]">
                          <div className="flex justify-between text-[10px] font-bold mb-1.5" style={{ color: "var(--tf-text-tertiary)" }}>
                            <span>{pct}% concluído</span>
                            <span>{total} tarefas</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tf-bg-secondary)" }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: sprintAtiva.cor }} />
                          </div>
                        </div>
                      ) : null;
                    })()}
                    <button
                      onClick={() => setAbaAtiva("sprints")}
                      className="w-full text-center mt-4 text-[11px] font-bold transition-smooth hover:underline"
                      style={{ color: "var(--tf-accent-text)" }}
                    >
                      Ver detalhes →
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ─── SPRINTS: Gráfico de progresso da sprint ativa ─── */}
            {abaAtiva === "sprints" && (
              <>
                {sprintAtiva ? (
                  <div className="rounded-[20px] p-5 border transition-smooth overflow-hidden" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                    <h3 className="text-[11px] font-black uppercase tracking-widest mb-5 flex items-center gap-2" style={{ color: "var(--tf-text-tertiary)" }}>
                      <Gauge size={13} /> Progresso da Sprint
                    </h3>
                    {(() => {
                      const tarefas = cartoesDaSprint(sprintAtiva.id);
                      const total = tarefas.length;
                      const done = tarefas.filter(t => t.coluna_nome?.toLowerCase().includes("conclu") || t.coluna_nome?.toLowerCase().includes("done")).length;
                      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                      const dias = diasRestantes(sprintAtiva.data_fim);
                      return (
                        <div className="space-y-5">
                          {/* Circular-ish progress */}
                          <div className="flex items-center justify-center">
                            <div className="relative w-28 h-28">
                              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--tf-bg-secondary)" strokeWidth="10" />
                                <circle cx="60" cy="60" r="52" fill="none" stroke={sprintAtiva.cor} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${pct * 3.27} 327`} className="transition-all duration-1000" />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[24px] font-black tracking-tight" style={{ color: "var(--tf-text)" }}>{pct}%</span>
                              </div>
                            </div>
                          </div>
                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
                              <p className="text-[18px] font-black" style={{ color: "var(--tf-text)" }}>{done}/{total}</p>
                              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>Tarefas</p>
                            </div>
                            <div className="text-center p-3 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
                              <p className="text-[18px] font-black" style={{ color: dias !== null && dias <= 2 ? "var(--tf-danger)" : "var(--tf-text)" }}>{dias !== null ? (dias > 0 ? `${dias}d` : dias === 0 ? "Hoje" : `−${Math.abs(dias)}d`) : "—"}</p>
                              <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>Restantes</p>
                            </div>
                          </div>
                          {/* Sprint name */}
                          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "var(--tf-border)" }}>
                            <div className="w-2 h-5 rounded-full shrink-0" style={{ background: sprintAtiva.cor }} />
                            <p className="text-[12px] font-bold truncate" style={{ color: "var(--tf-text)" }}>{sprintAtiva.nome}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="rounded-[20px] p-5 border transition-smooth text-center" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                    <Gauge size={28} className="mx-auto mb-3 opacity-30" style={{ color: "var(--tf-text-secondary)" }} />
                    <p className="text-[13px] font-bold" style={{ color: "var(--tf-text-secondary)" }}>Nenhuma sprint ativa</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>Ative uma sprint para ver o progresso aqui.</p>
                  </div>
                )}
              </>
            )}

            {/* ─── MÉTRICAS: Resumo rápido ─── */}
            {abaAtiva === "metricas" && (
              <div className="rounded-[20px] p-5 border transition-smooth overflow-hidden" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-5 flex items-center gap-2" style={{ color: "var(--tf-text-tertiary)" }}>
                  <Zap size={13} /> Resumo Rápido
                </h3>
                {(() => {
                  const allTarefas = sprintsDoWorkspace.flatMap(s => cartoesDaSprint(s.id));
                  const total = allTarefas.length + backlogPuro.length;
                  const done = allTarefas.filter(t => t.coluna_nome?.toLowerCase().includes("conclu") || t.coluna_nome?.toLowerCase().includes("done")).length;
                  const totalSprints = sprintsDoWorkspace.length;
                  const velocity = totalSprints > 0 ? (done / totalSprints).toFixed(1) : "—";
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3.5 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
                        <span className="text-[12px] font-bold" style={{ color: "var(--tf-text-secondary)" }}>Total tarefas</span>
                        <span className="text-[16px] font-black" style={{ color: "var(--tf-text)" }}>{total}</span>
                      </div>
                      <div className="flex items-center justify-between p-3.5 rounded-[14px]" style={{ background: "var(--tf-success-bg)" }}>
                        <span className="text-[12px] font-bold" style={{ color: "var(--tf-success)" }}>Concluídas</span>
                        <span className="text-[16px] font-black" style={{ color: "var(--tf-success)" }}>{done}</span>
                      </div>
                      <div className="flex items-center justify-between p-3.5 rounded-[14px]" style={{ background: "var(--tf-accent-light)" }}>
                        <span className="text-[12px] font-bold" style={{ color: "var(--tf-accent-text)" }}>Velocity</span>
                        <span className="text-[16px] font-black" style={{ color: "var(--tf-accent-text)" }}>{velocity}<span className="text-[10px] font-bold ml-0.5">/sprint</span></span>
                      </div>
                      <div className="flex items-center justify-between p-3.5 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
                        <span className="text-[12px] font-bold" style={{ color: "var(--tf-text-secondary)" }}>No backlog</span>
                        <span className="text-[16px] font-black" style={{ color: "var(--tf-text)" }}>{backlogPuro.length}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ─── AJUSTES: Dicas do workspace ─── */}
            {abaAtiva === "config" && (
              <div className="rounded-[20px] p-5 border transition-smooth overflow-hidden" style={{ background: "var(--tf-accent-light)", borderColor: "var(--tf-accent)" }}>
                <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: "var(--tf-accent-text)" }}><Zap size={15} /> Workspace Avançado</h3>
                <div className="space-y-3">
                  <p className="text-[12px] leading-relaxed font-medium" style={{ color: "var(--tf-accent-text)" }}>
                    Gerencie membros, permissões e integrações com GitHub na aba de repositórios.
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-bold pt-2 border-t" style={{ borderColor: "var(--tf-accent)", color: "var(--tf-accent-text)" }}>
                    <GitBranch size={12} />
                    <span>{repositorios.length} {repositorios.length === 1 ? "repo conectado" : "repos conectados"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── EQUIPE (visível em todas as abas exceto config) ─── */}
            {abaAtiva !== "config" && (
              <div className="rounded-[20px] p-5 border transition-smooth overflow-hidden" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[13px] font-bold tracking-tight" style={{ color: "var(--tf-text)" }}>Equipe</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-[8px]" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>
                    {wsUsuarios.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {wsUsuarios.slice(0, 4).map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 min-w-0">
                      {u.perfis?.avatar_url ? (
                        <img src={u.perfis.avatar_url} alt={u.perfis.nome || ""} className="w-8 h-8 rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-[14px] flex items-center justify-center text-[11px] font-black shrink-0" style={{ background: "var(--tf-accent)", color: "white" }}>
                          {(u.perfis?.nome || u.perfis?.email || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold truncate leading-tight" style={{ color: "var(--tf-text)" }}>{u.perfis?.nome || u.perfis?.email || "Usuário"}</p>
                        <p className="text-[10px] truncate font-medium" style={{ color: "var(--tf-text-tertiary)" }}>{u.papel === "admin" ? "Admin" : "Membro"}</p>
                      </div>
                    </div>
                  ))}
                  {wsUsuarios.length > 4 && (
                    <button onClick={() => setAbaAtiva("config")} className="text-[11px] font-bold text-left hover:underline transition-smooth" style={{ color: "var(--tf-accent-text)" }}>
                      +{wsUsuarios.length - 4} mais
                    </button>
                  )}
                  {wsUsuarios.length === 0 && (
                    <p className="text-[12px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>Nenhum membro.</p>
                  )}
                </div>

                <button onClick={() => setAbaAtiva("config")} className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-[12px] font-bold rounded-[14px] border-2 border-dashed transition-smooth hover:bg-[var(--tf-surface-hover)]" style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-secondary)" }}>
                  <Plus size={13} /> Convidar
                </button>
              </div>
            )}

          </div>

          </div>
        </main>
      </div>

      {/* Detalhe do cartão do backlog */}
      <DetalheCartao
        cartao={cartaoSelecionado}
        etiquetas={etiquetasWs}
        membros={membrosWs}
        onFechar={() => setCartaoSelecionado(null)}
        onAtualizar={async (id, campos) => {
          await (await import("@/lib/supabase/client")).supabase
            .from("cartoes")
            .update({ ...campos, atualizado_em: new Date().toISOString() })
            .eq("id", id);
          // Atualizar o cartão selecionado localmente (sem fechar o modal)
          setCartaoSelecionado((prev) => prev && prev.id === id ? { ...prev, ...campos } : prev);
          buscarBacklog();
        }}
        onExcluir={(id) => {
          excluirTarefa(id);
          setCartaoSelecionado(null);
        }}
        onCriarEtiqueta={criarEtiquetaWs}
        onExcluirEtiqueta={excluirEtiquetaWs}
        onCriarMembro={criarMembroWs}
        onRefresh={buscarBacklog}
      />

      {/* Gerar Cards com IA */}
      <GerarCardsModal
        aberto={modalIA}
        onFechar={() => setModalIA(false)}
        workspaceId={workspaceId}
        etiquetas={etiquetasWs}
        onCriarCards={async (cards) => {
          for (const card of cards) {
            const criado = await criarTarefa(card.titulo, card.peso, card.descricao);
            if (!criado) continue;

            // Criar checklist com itens (se houver)
            if (card.checklist && card.checklist.length > 0) {
              const { data: checklist } = await supabase
                .from("checklists")
                .insert({ cartao_id: criado.id, titulo: "Criterios de aceitacao", posicao: 0 })
                .select()
                .single();

              if (checklist) {
                const itens = card.checklist.map((texto: string, idx: number) => ({
                  checklist_id: checklist.id,
                  texto,
                  posicao: idx,
                  concluido: false,
                }));
                await supabase.from("checklist_itens").insert(itens);
              }
            }

            // Atribuir etiquetas (se houver)
            if (card.etiqueta_ids && card.etiqueta_ids.length > 0) {
              const inserts = card.etiqueta_ids.map((etiquetaId: string) => ({
                cartao_id: criado.id,
                etiqueta_id: etiquetaId,
              }));
              await supabase.from("cartao_etiquetas").insert(inserts);
            }
          }
          buscarBacklog();
        }}
      />

      {/* Planning Poker */}
      <PlanningPokerModal
        aberto={pokerAberto}
        onFechar={() => { setPokerAberto(false); setPokerCartaoId(null); }}
        workspaceId={workspaceId}
        cartaoInicialId={pokerCartaoId}
      />

      {/* Modal: Importar */}
      <ImportarModalDynamic aberto={modalImport} onFechar={() => setModalImport(false)} workspaceId={workspaceId} />

      {/* Modal: Nova Sprint */}
      <Modal aberto={modalSprint} onFechar={() => setModalSprint(false)} titulo="Criar nova sprint">
        <div className="space-y-4">
          <div className="h-16 rounded-[14px] flex items-center px-4 gap-3" style={{ background: `linear-gradient(145deg, ${sprintCor}, ${sprintCor}bb)` }}>
            <Calendar size={20} className="text-white/70" />
            <span className="text-white font-bold">{sprintNome || "Nome da sprint"}</span>
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Nome da sprint</label>
            <input value={sprintNome} onChange={(e) => setSprintNome(e.target.value)} placeholder="Ex: Sprint 14" className="w-full px-3 py-2 text-sm rounded-[8px] outline-none transition-smooth" style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")} onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")} autoFocus />
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Meta / Objetivo (opcional)</label>
            <input value={sprintMeta} onChange={(e) => setSprintMeta(e.target.value)} placeholder="O que queremos alcançar nessa sprint?" className="w-full px-3 py-2 text-sm rounded-[8px] outline-none transition-smooth" style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")} onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Início</label>
              <input type="date" value={sprintInicio} onChange={(e) => setSprintInicio(e.target.value)} className="w-full px-3 py-2 text-sm rounded-[8px] outline-none transition-smooth" style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} />
            </div>
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Fim</label>
              <input type="date" value={sprintFim} onChange={(e) => setSprintFim(e.target.value)} className="w-full px-3 py-2 text-sm rounded-[8px] outline-none transition-smooth" style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES_QUADRO.map((cor) => (
                <button key={cor} onClick={() => setSprintCor(cor)} className={`w-9 h-7 rounded-[8px] transition-smooth ${sprintCor === cor ? "ring-2 ring-offset-2 scale-110" : "hover:scale-105"}`} style={{ backgroundColor: cor }} />
              ))}
            </div>
          </div>

          <button onClick={handleCriarSprint} disabled={!sprintNome.trim()} className="w-full py-2.5 text-sm font-semibold text-white rounded-[8px] transition-smooth disabled:opacity-40" style={{ background: "var(--tf-accent)" }}>
            Criar sprint
          </button>
        </div>
      </Modal>

      {/* Modal: Conectar Repositório */}
      <ModalConectarRepo
        aberto={modalConectarRepo}
        onFechar={() => { setModalConectarRepo(false); setRepoInput(""); }}
        repoInput={repoInput}
        setRepoInput={setRepoInput}
        repositorios={repositorios}
        onConectar={(owner, nome) => {
          conectarRepo(owner, nome);
          setModalConectarRepo(false);
          setRepoInput("");
        }}
      />

      {/* Confirm delete sprint */}
      {confirmExcluirSprintId && (
        <Modal aberto onFechar={() => setConfirmExcluirSprintId(null)} titulo="Excluir sprint">
          <p className="text-[13px] mb-4" style={{ color: "var(--tf-text-secondary)" }}>
            Tem certeza? Os cards deste sprint irão para o backlog. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirmExcluirSprintId(null)}
              className="px-4 py-2 text-[13px] font-medium rounded-[10px]"
              style={{ color: "var(--tf-text-secondary)", background: "var(--tf-bg-secondary)" }}
            >
              Cancelar
            </button>
            <button
              onClick={async () => { await excluirQuadro(confirmExcluirSprintId); setConfirmExcluirSprintId(null); }}
              className="px-4 py-2 text-[13px] font-bold text-white rounded-[10px]"
              style={{ background: "var(--tf-danger)" }}
            >
              Sim, excluir
            </button>
          </div>
        </Modal>
      )}

      {/* Confirm remove member */}
      {confirmRemoverMembroId && (
        <Modal aberto onFechar={() => setConfirmRemoverMembroId(null)} titulo="Remover membro">
          <p className="text-[13px] mb-4" style={{ color: "var(--tf-text-secondary)" }}>
            Tem certeza que deseja remover este membro do workspace?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirmRemoverMembroId(null)}
              className="px-4 py-2 text-[13px] font-medium rounded-[10px]"
              style={{ color: "var(--tf-text-secondary)", background: "var(--tf-bg-secondary)" }}
            >
              Cancelar
            </button>
            <button
              onClick={async () => { await removerUsuario(confirmRemoverMembroId); setConfirmRemoverMembroId(null); }}
              className="px-4 py-2 text-[13px] font-bold text-white rounded-[10px]"
              style={{ background: "var(--tf-danger)" }}
            >
              Sim, remover
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
