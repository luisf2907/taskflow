"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Folder,
  Gauge,
  GitBranch,
  GripVertical,
  Inbox,
  Kanban,
  Layers,
  Mail,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  UserMinus,
  Users,
  X,
  Zap,
} from "lucide-react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Modal } from "@/components/ui/modal";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { diasRestantes, formatarDataISO as formatarData } from "@/lib/datas";

import { useSidebar } from "@/hooks/use-sidebar";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useBacklog, CartaoBacklog } from "@/hooks/use-backlog";
import { useEtiquetasWorkspace } from "@/hooks/use-etiquetas-workspace";
import { useMembrosWorkspace } from "@/hooks/use-membros-workspace";
import { useRepositorios } from "@/hooks/use-repositorios";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { useRealtimeWorkspace } from "@/hooks/use-realtime";
import { usePRSync } from "@/hooks/use-pr-sync";
import { useWorkspaceUsuarios } from "@/hooks/use-workspace-usuarios";
import { Quadro } from "@/types";

// Sub-componentes extraidos desta pagina
import { ExportDropdown } from "@/components/workspace/export-dropdown";
import { InviteLinkInline } from "@/components/workspace/invite-link-inline";
import { ModalConectarRepo } from "@/components/workspace/modal-conectar-repo";
import { BacklogRow } from "@/components/workspace/backlog/backlog-row";
import {
  BacklogPuroDropZone,
  SprintDropZone,
} from "@/components/workspace/backlog/drop-zones";

// Lazy load: detalhe do cartao
const DetalheCartao = dynamic(
  () => import("@/components/quadro/detalhe-cartao").then((m) => m.DetalheCartao),
  { ssr: false }
);

// Lazy load: componentes de abas (so carregam quando usuario clica na aba)
const MetricasWorkspace = dynamic(
  () => import("@/components/workspace/metricas").then((m) => m.MetricasWorkspace),
  { ssr: false }
);
const TimelineView = dynamic(
  () => import("@/components/workspace/timeline").then((m) => m.TimelineView),
  { ssr: false }
);
const AutomacoesConfig = dynamic(
  () => import("@/components/workspace/automacoes-config").then((m) => m.AutomacoesConfig),
  { ssr: false }
);
const AtividadesFeed = dynamic(
  () => import("@/components/workspace/atividades-feed"),
  { ssr: false }
);

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

const CORES_QUADRO = [
  "#C4841D", "#3D8B37", "#B04632", "#2E86AB",
  "#89609E", "#CD5A91", "#00857C", "#D4732A",
];

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
                    <p className="text-xs mb-3 px-3 py-2 rounded-[8px]" style={{ background: "var(--tf-danger-bg)", color: "var(--tf-danger)" }}>
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
