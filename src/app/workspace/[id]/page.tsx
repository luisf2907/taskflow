"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Modal } from "@/components/ui/modal";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useBacklog, CartaoBacklog } from "@/hooks/use-backlog";
import { useEtiquetasWorkspace } from "@/hooks/use-etiquetas-workspace";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { DetalheCartao } from "@/components/quadro/detalhe-cartao";
import { Quadro, StatusSprint } from "@/types";
import {
  Calendar,
  ChevronRight,
  Folder,
  Gauge,
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
  X,
  Zap,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const CORES_QUADRO = [
  "#C4841D", "#3D8B37", "#B04632", "#2E86AB",
  "#89609E", "#CD5A91", "#00857C", "#D4732A",
];

function diasRestantes(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const diff = new Date(dataFim).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatarData(data: string | null): string {
  if (!data) return "—";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function BacklogRow({
  tarefa, sprints, etiquetas, isLast, onAssociar, onDesassociar, onExcluir, onClick,
}: {
  tarefa: CartaoBacklog;
  sprints: Quadro[];
  etiquetas: import("@/types").Etiqueta[];
  isLast: boolean;
  onAssociar: (cartaoId: string, quadroId: string) => void;
  onDesassociar: (cartaoId: string, quadroIdOriginal: string) => void;
  onExcluir: (cartaoId: string) => void;
  onClick: () => void;
}) {
  const [seletor, setSeletor] = useState(false);
  const noSprint = !tarefa.coluna_id;

  // Etiquetas do cartão (via texto array legado — simplificado)
  const etiquetasDoCartao = etiquetas.filter((e) =>
    tarefa.etiquetas?.includes(e.nome) || tarefa.etiquetas?.includes(e.id)
  );

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 transition-smooth group cursor-pointer ${!isLast ? "border-b" : ""}`}
      style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--tf-surface)")}
      onClick={onClick}
    >
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
        <span className="text-[11px] px-2 py-0.5 rounded-md shrink-0" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}>
          {tarefa.coluna_nome}
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
            className="text-[12px] px-2 py-1 rounded-md outline-none"
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
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
          style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}
        >
          <ArrowRight size={10} /> Mover pra sprint
        </button>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); if (tarefa.quadro_id) onDesassociar(tarefa.id, tarefa.quadro_id); }}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
          style={{ color: "var(--tf-danger)" }}
          title="Remover da sprint"
        >
          <X size={10} /> Remover
        </button>
      )}

      {/* Excluir */}
      <button
        onClick={(e) => { e.stopPropagation(); onExcluir(tarefa.id); }}
        className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
        style={{ color: "var(--tf-text-tertiary)" }}
        title="Excluir tarefa"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function PaginaWorkspace() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const { workspaces, atualizar: atualizarWs, excluir: excluirWs } = useWorkspaces();
  const { quadros, criar: criarQuadro, atualizar: atualizarQuadro, excluir: excluirQuadro } = useQuadros();
  const { backlogPuro, cartoesDaSprint, criarTarefa, associarASprint, desassociarDeSprint, excluirTarefa, buscar: buscarBacklog } = useBacklog(workspaceId);
  const { etiquetas: etiquetasWs, criar: criarEtiquetaWs, excluir: excluirEtiquetaWs } = useEtiquetasWorkspace(workspaceId);

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<"backlog" | "sprints" | "config">("sprints");

  // Backlog
  const [novaTarefa, setNovaTarefa] = useState("");
  const [novaTarefaPeso, setNovaTarefaPeso] = useState("");
  const [criandoTarefa, setCriandoTarefa] = useState(false);
  const [cartaoSelecionado, setCartaoSelecionado] = useState<CartaoComResumo | null>(null);

  function abrirDetalhe(tarefa: CartaoBacklog) {
    // Converter CartaoBacklog para CartaoComResumo (que o DetalheCartao espera)
    const como: CartaoComResumo = {
      ...tarefa,
      etiqueta_ids: [],
      membro_ids: [],
      total_checklist_itens: 0,
      total_checklist_concluidos: 0,
      total_anexos: 0,
    };
    setCartaoSelecionado(como);
  }

  // Modal novo sprint
  const [modalSprint, setModalSprint] = useState(false);
  const [sprintNome, setSprintNome] = useState("");
  const [sprintMeta, setSprintMeta] = useState("");
  const [sprintCor, setSprintCor] = useState(CORES_QUADRO[0]);
  const [sprintInicio, setSprintInicio] = useState("");
  const [sprintFim, setSprintFim] = useState("");

  // Config workspace
  const [wsNome, setWsNome] = useState("");
  const [wsDescricao, setWsDescricao] = useState("");
  const [editandoConfig, setEditandoConfig] = useState(false);

  const sprintsDoWorkspace = useMemo(
    () => quadros.filter((q) => q.workspace_id === workspaceId),
    [quadros, workspaceId]
  );

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

    if (quadro && workspace?.colunas_padrao) {
      // Criar colunas padrão não é possível aqui diretamente
      // O usuário criará no board
    }

    setModalSprint(false);
    setSprintNome(""); setSprintMeta(""); setSprintInicio(""); setSprintFim("");
    setSprintCor(CORES_QUADRO[0]);

    if (quadro) router.push(`/quadro/${quadro.id}`);
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
      <div className="h-full flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--tf-accent)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  function SprintCard({ sprint, tipo }: { sprint: Quadro; tipo: "ativa" | "planejada" | "concluida" }) {
    const dias = diasRestantes(sprint.data_fim);

    return (
      <div
        className="rounded-xl border p-4 transition-smooth"
        style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-8 rounded-full" style={{ background: sprint.cor }} />
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>{sprint.nome}</h3>
              {sprint.data_inicio && sprint.data_fim && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
                  {formatarData(sprint.data_inicio)} → {formatarData(sprint.data_fim)}
                  {dias !== null && tipo === "ativa" && (
                    <span className="ml-1.5 font-semibold" style={{ color: dias <= 2 ? "var(--tf-danger)" : dias <= 5 ? "var(--tf-warning)" : "var(--tf-success)" }}>
                      · {dias > 0 ? `${dias}d restantes` : dias === 0 ? "Último dia!" : `${Math.abs(dias)}d atrasada`}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {tipo === "planejada" && (
              <button
                onClick={() => ativarSprint(sprint.id)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white rounded-md transition-smooth"
                style={{ background: "var(--tf-success)" }}
              >
                <Play size={10} /> Ativar
              </button>
            )}
            {tipo === "ativa" && (
              <button
                onClick={() => concluirSprint(sprint.id)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white rounded-md transition-smooth"
                style={{ background: "var(--tf-accent)" }}
              >
                <CheckCircle2 size={10} /> Concluir
              </button>
            )}
            <Dropdown
              trigger={<button className="p-1 rounded-md transition-smooth" style={{ color: "var(--tf-text-tertiary)" }}><MoreHorizontal size={16} /></button>}
            >
              <DropdownItem onClick={() => router.push(`/quadro/${sprint.id}`)}>
                <ChevronRight size={14} /> Abrir board
              </DropdownItem>
              <DropdownItem perigo onClick={() => excluirQuadro(sprint.id)}>
                <Trash2 size={14} /> Excluir sprint
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        {sprint.meta && (
          <div className="flex items-start gap-2 mb-3 ml-5">
            <Target size={12} className="mt-0.5 shrink-0" style={{ color: "var(--tf-text-tertiary)" }} />
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--tf-text-secondary)" }}>{sprint.meta}</p>
          </div>
        )}

        <div className="flex items-center gap-3 ml-5">
          <button
            onClick={() => router.push(`/quadro/${sprint.id}`)}
            className="text-[12px] font-medium transition-smooth"
            style={{ color: "var(--tf-accent-text)" }}
          >
            Abrir board →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar quadros={quadros} onNovoQuadro={() => setModalSprint(true)} aberta={sidebarAberta} onToggle={() => setSidebarAberta(!sidebarAberta)} />

        <main className="flex-1 overflow-y-auto" style={{ background: "var(--tf-bg)" }}>
          {/* Workspace Header */}
          <div className="border-b px-8 py-5" style={{ borderColor: "var(--tf-border)" }}>
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: workspace.cor }}>
                  <Folder size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: "var(--tf-text)" }}>{workspace.nome}</h1>
                  {workspace.descricao && (
                    <p className="text-[13px]" style={{ color: "var(--tf-text-tertiary)" }}>{workspace.descricao}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setModalSprint(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-white rounded-lg transition-smooth"
                style={{ background: "var(--tf-accent)" }}
              >
                <Plus size={15} /> Nova Sprint
              </button>
            </div>

            {/* Tabs */}
            <div className="max-w-4xl mx-auto flex gap-1 mt-4">
              {[
                { id: "backlog" as const, label: "Backlog", icon: Inbox },
                { id: "sprints" as const, label: "Sprints", icon: Calendar },
                { id: "config" as const, label: "Configurações", icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setAbaAtiva(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-smooth"
                  style={{
                    background: abaAtiva === id ? "var(--tf-accent-light)" : "transparent",
                    color: abaAtiva === id ? "var(--tf-accent-text)" : "var(--tf-text-tertiary)",
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">

            {/* ═══ ABA BACKLOG ═══ */}
            {abaAtiva === "backlog" && (
              <>
                {/* Header + Criar */}
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold" style={{ color: "var(--tf-text)" }}>
                    Todas as tarefas do workspace
                  </h2>
                  {!criandoTarefa && (
                    <button
                      onClick={() => setCriandoTarefa(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white rounded-lg transition-smooth"
                      style={{ background: "var(--tf-accent)" }}
                    >
                      <Plus size={14} /> Nova tarefa
                    </button>
                  )}
                </div>

                {/* Form criar tarefa */}
                {criandoTarefa && (
                  <div className="rounded-xl border p-4 space-y-3" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                    <div className="flex gap-3">
                      <input
                        value={novaTarefa}
                        onChange={(e) => setNovaTarefa(e.target.value)}
                        placeholder="Título da tarefa..."
                        className="flex-1 px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
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
                        className="w-16 px-3 py-2 text-sm rounded-lg outline-none transition-smooth text-center"
                        style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCriarTarefa} disabled={!novaTarefa.trim()} className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-40 transition-smooth" style={{ background: "var(--tf-accent)" }}>
                        Criar
                      </button>
                      <button onClick={() => { setCriandoTarefa(false); setNovaTarefa(""); setNovaTarefaPeso(""); }} className="px-4 py-1.5 text-sm rounded-lg transition-smooth" style={{ color: "var(--tf-text-secondary)" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Seção: Sem Sprint (backlog puro) */}
                {backlogPuro.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <Inbox size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-secondary)" }}>
                        Sem sprint ({backlogPuro.length})
                      </h3>
                    </div>
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--tf-border)" }}>
                      {backlogPuro.map((tarefa, i) => (
                        <BacklogRow key={tarefa.id} tarefa={tarefa} sprints={sprintsDoWorkspace} etiquetas={etiquetasWs} isLast={i === backlogPuro.length - 1} onAssociar={associarASprint} onDesassociar={desassociarDeSprint} onExcluir={excluirTarefa} onClick={() => abrirDetalhe(tarefa)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Seções por Sprint */}
                {sprintsDoWorkspace.map((sprint) => {
                  const tarefas = cartoesDaSprint(sprint.id);
                  if (tarefas.length === 0) return null;

                  return (
                    <section key={sprint.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{
                          background: sprint.status_sprint === "ativa" ? "var(--tf-success)" : sprint.status_sprint === "concluida" ? "var(--tf-text-tertiary)" : "var(--tf-warning)"
                        }} />
                        <h3 className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-secondary)" }}>
                          {sprint.nome} ({tarefas.length})
                        </h3>
                        <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                          {sprint.status_sprint === "ativa" ? "ativa" : sprint.status_sprint === "concluida" ? "concluída" : "planejada"}
                        </span>
                      </div>
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--tf-border)" }}>
                        {tarefas.map((tarefa, i) => (
                          <BacklogRow key={tarefa.id} tarefa={tarefa} sprints={sprintsDoWorkspace} etiquetas={etiquetasWs} isLast={i === tarefas.length - 1} onAssociar={associarASprint} onDesassociar={desassociarDeSprint} onExcluir={excluirTarefa} onClick={() => abrirDetalhe(tarefa)} />
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
                    <button onClick={() => setCriandoTarefa(true)} className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: "var(--tf-accent)" }}>
                      Criar primeira tarefa
                    </button>
                  </div>
                )}
              </>
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
                    <button onClick={() => setModalSprint(true)} className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: "var(--tf-accent)" }}>
                      Criar sprint
                    </button>
                  </div>
                )}
              </>
            )}

            {abaAtiva === "config" && (
              <section className="space-y-6">
                <div className="rounded-xl border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
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
                        <input value={wsNome} onChange={(e) => setWsNome(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-accent)", color: "var(--tf-text)" }} />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold mb-1 block" style={{ color: "var(--tf-text-secondary)" }}>Descrição</label>
                        <input value={wsDescricao} onChange={(e) => setWsDescricao(e.target.value)} placeholder="Descrição do workspace" className="w-full px-3 py-2 text-sm rounded-lg outline-none" style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={salvarConfig} className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg" style={{ background: "var(--tf-accent)" }}>Salvar</button>
                        <button onClick={() => setEditandoConfig(false)} className="px-4 py-1.5 text-sm rounded-lg" style={{ color: "var(--tf-text-secondary)" }}>Cancelar</button>
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

                <div className="rounded-xl border p-5" style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: "var(--tf-text)" }}>Colunas padrão</h3>
                  <p className="text-[12px] mb-2" style={{ color: "var(--tf-text-tertiary)" }}>Colunas criadas automaticamente em novas sprints</p>
                  <div className="flex flex-wrap gap-2">
                    {workspace.colunas_padrao?.map((col, i) => (
                      <span key={i} className="px-3 py-1.5 text-[12px] font-medium rounded-lg" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}>
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border p-5" style={{ background: "var(--tf-danger-bg)", borderColor: "var(--tf-danger)" }}>
                  <h3 className="text-sm font-bold mb-2" style={{ color: "var(--tf-danger)" }}>Zona de perigo</h3>
                  <p className="text-[12px] mb-3" style={{ color: "var(--tf-text-secondary)" }}>Excluir este workspace. Os quadros/sprints ficarão como avulsos.</p>
                  <button
                    onClick={async () => { await excluirWs(workspaceId); router.push("/"); }}
                    className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg" style={{ background: "var(--tf-danger)" }}
                  >
                    Excluir workspace
                  </button>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Detalhe do cartão do backlog */}
      <DetalheCartao
        cartao={cartaoSelecionado}
        etiquetas={etiquetasWs}
        membros={[]}
        onFechar={() => setCartaoSelecionado(null)}
        onAtualizar={async (id, campos) => {
          await (await import("@/lib/supabase/client")).supabase
            .from("cartoes")
            .update({ ...campos, atualizado_em: new Date().toISOString() })
            .eq("id", id);
          buscarBacklog();
          setCartaoSelecionado(null);
        }}
        onExcluir={(id) => {
          excluirTarefa(id);
          setCartaoSelecionado(null);
        }}
        onCriarEtiqueta={criarEtiquetaWs}
        onExcluirEtiqueta={excluirEtiquetaWs}
        onCriarMembro={() => {}}
        onRefresh={buscarBacklog}
      />

      {/* Modal: Nova Sprint */}
      <Modal aberto={modalSprint} onFechar={() => setModalSprint(false)} titulo="Criar nova sprint">
        <div className="space-y-4">
          <div className="h-16 rounded-xl flex items-center px-4 gap-3" style={{ background: `linear-gradient(145deg, ${sprintCor}, ${sprintCor}bb)` }}>
            <Calendar size={20} className="text-white/70" />
            <span className="text-white font-bold">{sprintNome || "Nome da sprint"}</span>
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Nome da sprint</label>
            <input value={sprintNome} onChange={(e) => setSprintNome(e.target.value)} placeholder="Ex: Sprint 14" className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth" style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")} onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")} autoFocus />
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Meta / Objetivo (opcional)</label>
            <input value={sprintMeta} onChange={(e) => setSprintMeta(e.target.value)} placeholder="O que queremos alcançar nessa sprint?" className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth" style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")} onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Início</label>
              <input type="date" value={sprintInicio} onChange={(e) => setSprintInicio(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth" style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} />
            </div>
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Fim</label>
              <input type="date" value={sprintFim} onChange={(e) => setSprintFim(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth" style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }} />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES_QUADRO.map((cor) => (
                <button key={cor} onClick={() => setSprintCor(cor)} className={`w-9 h-7 rounded-lg transition-smooth ${sprintCor === cor ? "ring-2 ring-offset-2 scale-110" : "hover:scale-105"}`} style={{ backgroundColor: cor }} />
              ))}
            </div>
          </div>

          <button onClick={handleCriarSprint} disabled={!sprintNome.trim()} className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-smooth disabled:opacity-40" style={{ background: "var(--tf-accent)" }}>
            Criar sprint
          </button>
        </div>
      </Modal>
    </div>
  );
}
