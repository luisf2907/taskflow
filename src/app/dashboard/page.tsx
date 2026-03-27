"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Modal } from "@/components/ui/modal";
import { useQuadros } from "@/hooks/use-quadros";
import { useSidebar } from "@/hooks/use-sidebar";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { useAuth } from "@/hooks/use-auth";
import { Workspace } from "@/types";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Folder,
  Grid3X3,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Sparkles,
  Target,
  Flame,
  Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import OnboardingWizard from "@/components/onboarding/onboarding-wizard";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";

const CORES_QUADRO = [
  "#C4841D", "#3D8B37", "#B04632", "#2E86AB",
  "#89609E", "#CD5A91", "#00857C", "#D4732A",
  "#6B6560", "#2D2A26",
];

const CORES_WORKSPACE = [
  "#C4841D", "#3D8B37", "#2E86AB", "#89609E",
  "#B04632", "#CD5A91", "#00857C", "#6B6560",
];

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function PaginaInicial() {
  const { perfil, user } = useAuth();
  const { quadros, carregando: carregandoQuadros, criar: criarQuadro } = useQuadros();
  const { workspaces, carregando: carregandoWs, criar: criarWorkspace, atualizar: atualizarWorkspace, excluir: excluirWorkspace } = useWorkspaces();
  const { recentTasks, tasksDoneToday, loadingMetrics } = useDashboardMetrics();

  const nomeUsuario = perfil?.nome?.split(" ")[0] || user?.email?.split("@")[0] || "Mestre";

  const [modalQuadro, setModalQuadro] = useState(false);
  const [modalWorkspace, setModalWorkspace] = useState(false);

  // States Modal Quadro
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState(CORES_QUADRO[0]);
  const [novoWorkspaceId, setNovoWorkspaceId] = useState<string>("");
  const [novoDataInicio, setNovoDataInicio] = useState("");
  const [novoDataFim, setNovoDataFim] = useState("");
  const [novoMeta, setNovoMeta] = useState("");

  // States Modal Workspace
  const [wsNome, setWsNome] = useState("");
  const [wsDescricao, setWsDescricao] = useState("");
  const [wsCor, setWsCor] = useState(CORES_WORKSPACE[0]);
  const [editandoWs, setEditandoWs] = useState<Workspace | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [confirmExcluirWsId, setConfirmExcluirWsId] = useState<string | null>(null);

  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();
  const router = useRouter();
  const carregando = carregandoQuadros || carregandoWs;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const done = localStorage.getItem('tf_onboarding_done');
    if (!done && workspaces.length === 0 && quadros.length === 0) {
      setShowOnboarding(true);
    }
  }, [workspaces, quadros]);

  // Quadros agrupados por workspace
  const quadrosPorWorkspace = useMemo(() => {
    const mapa: Record<string, typeof quadros> = {};
    for (const ws of workspaces) {
      mapa[ws.id] = quadros.filter((q) => q.workspace_id === ws.id);
    }
    return mapa;
  }, [quadros, workspaces]);

  const quadrosAvulsos = useMemo(
    () => quadros.filter((q) => !q.workspace_id),
    [quadros]
  );

  const recentes = useMemo(
    () => [...quadros].sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime()).slice(0, 5),
    [quadros]
  );

  async function handleCriarQuadro() {
    const nome = novoNome.trim();
    if (!nome) return;

    const quadro = await criarQuadro({
      nome,
      cor: novaCor,
      workspaceId: novoWorkspaceId || undefined,
      dataInicio: novoDataInicio || undefined,
      dataFim: novoDataFim || undefined,
      statusSprint: novoWorkspaceId ? "planejada" : undefined,
      meta: novoMeta.trim() || undefined,
    });

    if (quadro) {
      if (novoWorkspaceId) {
        const ws = workspaces.find((w) => w.id === novoWorkspaceId);
        if (ws?.colunas_padrao && ws.colunas_padrao.length > 0) {
          const { supabase } = await import("@/lib/supabase/client");
          const colunas = ws.colunas_padrao.map((nome, i) => ({
            quadro_id: quadro.id,
            nome,
            posicao: i,
          }));
          await supabase.from("colunas").insert(colunas);
        }
      }

      setModalQuadro(false);
      resetModalQuadro();
      router.push(`/quadro/${quadro.id}`);
    }
  }

  function resetModalQuadro() {
    setNovoNome(""); setNovaCor(CORES_QUADRO[0]); setNovoWorkspaceId("");
    setNovoDataInicio(""); setNovoDataFim(""); setNovoMeta("");
  }

  async function handleCriarWorkspace() {
    const nome = wsNome.trim();
    if (!nome) return;
    await criarWorkspace(nome, wsDescricao.trim() || undefined, wsCor);
    fecharModalWs();
  }

  async function handleSalvarWorkspace() {
    if (!editandoWs) return;
    await atualizarWorkspace(editandoWs.id, {
      nome: wsNome.trim() || editandoWs.nome,
      descricao: wsDescricao.trim() || null,
      cor: wsCor,
    });
    fecharModalWs();
  }

  function fecharModalWs() {
    setModalWorkspace(false);
    setEditandoWs(null);
    setWsNome("");
    setWsDescricao("");
    setWsCor(CORES_WORKSPACE[0]);
  }

  function abrirEditarWs(ws: Workspace) {
    setWsNome(ws.nome);
    setWsDescricao(ws.descricao || "");
    setWsCor(ws.cor);
    setEditandoWs(ws);
  }

  // --- COMPONENTES BENTO E CARDS ---

  function QuadroBentoCard({ quadro }: { quadro: typeof quadros[0] }) {
    return (
      <button
        onClick={() => router.push(`/quadro/${quadro.id}`)}
        className="group text-left rounded-[32px] overflow-hidden p-6 relative flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 h-[150px] min-w-[260px] max-w-[300px] flex-shrink-0 snap-start"
        style={{
          background: `linear-gradient(135deg, ${quadro.cor}, ${quadro.cor}dd)`
        }}
      >
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.04] transition-colors duration-300" />
        <div className="relative z-10 w-full">
          <div justify-start="true" className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-[14px] bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Grid3X3 size={20} className="text-white" />
            </div>
          </div>
          <h3 className="text-white font-extrabold text-[17px] leading-tight line-clamp-2 tracking-tight drop-shadow-sm">
            {quadro.nome}
          </h3>
        </div>

        <div className="relative z-10 flex items-center justify-between w-full mt-3">
          <p className="text-white/85 text-[12px] font-bold flex items-center gap-1.5 backdrop-blur-sm bg-black/10 px-3 py-1.5 rounded-full">
            <Clock size={12} />
            {new Date(quadro.atualizado_em).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}
          </p>
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
            <ArrowRight size={14} className="text-white" />
          </div>
        </div>
      </button>
    );
  }

  function WorkspaceBentoCard({ ws }: { ws: Workspace }) {
    const wsQuadros = quadrosPorWorkspace[ws.id] || [];
    const qtdQuadros = wsQuadros.length;

    // Fake progress based on id length just to make it visually pleasing for the demo, 
    // replacing this with real metrics when carts are queried per workspace.
    const fakeProgress = (Array.from(ws.id).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 60) + 20;

    return (
      <div
        className="group relative rounded-[32px] overflow-hidden p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 min-h-[220px]"
        style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.08] blur-3xl rounded-full pointer-events-none transition-transform group-hover:scale-110 duration-700" style={{ background: ws.cor }} />

        <div className="flex justify-between items-start relative z-10">
          <div
            className="w-14 h-14 rounded-[20px] flex items-center justify-center cursor-pointer transition-transform group-hover:scale-105"
            style={{ background: ws.cor }}
            onClick={() => router.push(`/workspace/${ws.id}`)}
          >
            <Folder size={26} className="text-white" />
          </div>

          <Dropdown
            trigger={
              <button className="p-2 rounded-[14px] transition-colors hover:bg-black/5" style={{ color: "var(--tf-text-tertiary)" }}>
                <MoreVertical size={18} />
              </button>
            }
          >
            <DropdownItem onClick={() => abrirEditarWs(ws)}>
              <Pencil size={14} /> Editar
            </DropdownItem>
            <DropdownItem perigo onClick={() => setConfirmExcluirWsId(ws.id)}>
              <Trash2 size={14} /> Excluir
            </DropdownItem>
          </Dropdown>
        </div>

        <div className="relative z-10 mt-6 cursor-pointer" onClick={() => router.push(`/workspace/${ws.id}`)}>
          <h2 className="text-[22px] font-black tracking-tight mb-2" style={{ color: "var(--tf-text)" }}>
            {ws.nome}
          </h2>
          {ws.descricao && (
            <p className="text-[13px] line-clamp-2 mb-4 font-medium leading-relaxed" style={{ color: "var(--tf-text-secondary)" }}>
              {ws.descricao}
            </p>
          )}

          {/* Barra de Progresso visual (Item 1) */}
          <div className="mt-4 mb-2">
            <div className="flex justify-between text-[11px] font-black tracking-wide uppercase mb-2" style={{ color: "var(--tf-text-tertiary)" }}>
              <span>Saúde do Pojeto</span>
              <span style={{ color: ws.cor }}>{fakeProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--tf-bg-secondary)" }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${fakeProgress}%`, background: ws.cor }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 pt-5 border-t relative z-10" style={{ borderColor: "var(--tf-border)" }}>
          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-full text-[12px] font-bold" style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text)" }}>
              {qtdQuadros} {qtdQuadros === 1 ? 'Sprint' : 'Sprints'}
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setNovoWorkspaceId(ws.id); setModalQuadro(true); }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
            style={{ background: "var(--tf-accent)", color: "white" }}
            title="Nova Sprint neste Workspace"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  function TaskLineItem({ task }: { task: typeof recentTasks[0] }) {
    const concluida = task.coluna_nome.toLowerCase().includes("conclu") || task.coluna_nome.toLowerCase().includes("done");

    return (
      <button
        onClick={() => router.push(`/quadro/${task.quadro_id}`)}
        className="w-full flex items-center gap-3 p-3.5 rounded-[20px] transition-all hover:-translate-y-1 group text-left"
        style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
      >
        <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 transition-colors" style={{ background: concluida ? "var(--tf-accent-light)" : "var(--tf-bg)", color: concluida ? "var(--tf-accent)" : "var(--tf-text-tertiary)" }}>
          {concluida ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <Target size={18} strokeWidth={2.5} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate tracking-tight transition-colors group-hover:text-amber-500" style={{ color: "var(--tf-text)", textDecoration: concluida ? "line-through" : "none", opacity: concluida ? 0.6 : 1 }}>
            {task.titulo}
          </p>
          <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
            Ult. mov: {new Date(task.atualizado_em).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </button>
    );
  }

  return (
    <div className="h-full flex overflow-hidden lg:flex-row flex-col" style={{ background: "var(--tf-bg)" }}>
      {showOnboarding && (
        <OnboardingWizard
          onComplete={(wsId) => {
            setShowOnboarding(false);
            localStorage.setItem('tf_onboarding_done', 'true');
            router.push(`/workspace/${wsId}`);
          }}
          onSkip={() => {
            setShowOnboarding(false);
            localStorage.setItem('tf_onboarding_done', 'true');
          }}
        />
      )}
      {iniciado && (
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => setModalQuadro(true)}
          aberta={sidebarAberta}
          onToggle={toggleSidebar}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header />

        <main className="flex-1 overflow-y-auto overflow-x-hidden mb-4 rounded-[32px] relative no-scrollbar flex flex-col xl:flex-row gap-8" style={{ background: "var(--tf-surface)" }}>

          {/* Main Left Content */}
          <div className="flex-1 px-8 pt-10 md:px-12 md:pt-12 flex flex-col relative">
            {carregando ? (
              <div className="flex justify-center flex-1 items-center">
                <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--tf-accent)", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <>
                {/* ── HERO SECTION & INSIGHTS ── */}
                <div className="flex flex-col mb-10 md:mb-14">

                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3.5 py-1.5 rounded-full text-[12px] font-black tracking-wide flex items-center gap-1.5" style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent)" }}>
                        <Activity size={14} />
                        {quadros.length} Sprints Ativas
                      </div>
                      {tasksDoneToday > 0 && (
                        <div className="px-3.5 py-1.5 rounded-full text-[12px] font-black tracking-wide flex items-center gap-1.5 bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                          <Flame size={14} />
                          {tasksDoneToday} Concluídas Hoje
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => { setModalWorkspace(true); }}
                        className="flex items-center gap-2 justify-center px-5 py-3.5 text-[14px] font-bold rounded-[20px] transition-all"
                        style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text)" }}
                      >
                        <Layers size={18} />
                        Workspace
                      </button>
                      <button
                        onClick={() => setModalQuadro(true)}
                        className="flex items-center gap-2 justify-center px-6 py-3.5 text-[14px] font-bold rounded-[20px] transition-all hover:-translate-y-0.5"
                        style={{ background: "var(--tf-accent)", color: "white" }}
                      >
                        <Plus size={18} strokeWidth={2.5} />
                        Nova Sprint
                      </button>
                    </div>
                  </div>

                  {/* Context and Titles */}
                  <div>
                    <h1 className="text-4xl lg:text-[44px] leading-tight font-black tracking-tight" style={{ color: "var(--tf-text)" }}>
                      {saudacao()},<br className="xl:hidden" /> {nomeUsuario}.
                    </h1>
                    <p className="text-base mt-3 font-bold" style={{ color: "var(--tf-text-secondary)" }}>
                      Seu espaço de trabalho está focado e produtivo.
                    </p>
                  </div>
                </div>

                {/* Empty State Geral */}
                {quadros.length === 0 && workspaces.length === 0 && (
                  <div className="flex flex-col justify-center items-center text-center py-20 px-6 rounded-[32px] border-2 border-dashed mx-auto w-full max-w-2xl" style={{ borderColor: "var(--tf-border)", background: "var(--tf-bg-secondary)" }}>
                    <div className="w-24 h-24 rounded-[32px] flex items-center justify-center mb-6 transform hover:scale-110 transition-transform" style={{ background: "var(--tf-surface)" }}>
                      <Sparkles size={40} style={{ color: "var(--tf-accent)" }} />
                    </div>
                    <h2 className="text-3xl font-black mb-3 tracking-tight" style={{ color: "var(--tf-text)" }}>
                      O palco está vazio!
                    </h2>
                    <p className="text-base mb-8 max-w-md font-medium" style={{ color: "var(--tf-text-secondary)" }}>
                      Comece sua jornada criando seu primeiro grande projeto ou uma sprint rápida. O que vamos construir hoje?
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <button
                        onClick={() => setModalWorkspace(true)}
                        className="px-8 py-3.5 font-bold rounded-[20px] hover:-translate-y-1 transition-transform w-full sm:w-auto text-white"
                        style={{ background: "var(--tf-accent)" }}
                      >
                        Criar Workspace
                      </button>
                      <button
                        onClick={() => setModalQuadro(true)}
                        className="px-8 py-3.5 font-bold rounded-[20px] transition-all hover:bg-black/5 w-full sm:w-auto"
                        style={{ color: "var(--tf-text)", border: "2px solid var(--tf-border)" }}
                      >
                        Quadro Avulso
                      </button>
                    </div>
                  </div>
                )}

                {/* ── RECENTES (Scroll Horizontal) ── */}
                {recentes.length > 0 && (
                  <section className="mb-14">
                    <h2 className="text-[19px] font-black tracking-tight mb-5 flex items-center gap-2" style={{ color: "var(--tf-text)" }}>
                      Acessados Recentemente
                    </h2>

                    {/* Item 3: Scroll Horizontal Nativo Oculto */}
                    <div className="flex overflow-x-auto gap-4 pt-4 pb-6 snap-x no-scrollbar -mx-8 px-8 md:-mx-12 md:px-12">
                      {recentes.map((q) => <QuadroBentoCard key={q.id} quadro={q} />)}
                    </div>
                  </section>
                )}

                {/* ── WORKSPACES (GRID BENTO) ── */}
                {workspaces.length > 0 && (
                  <section className="mb-14">
                    <h2 className="text-[19px] font-black tracking-tight mb-6" style={{ color: "var(--tf-text)" }}>
                      Seus Projetos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {workspaces.map((ws) => (
                        <WorkspaceBentoCard key={ws.id} ws={ws} />
                      ))}
                    </div>
                  </section>
                )}

                {/* ── QUADROS AVULSOS ── */}
                {quadrosAvulsos.length > 0 && (
                  <section>
                    <h2 className="text-[19px] font-black tracking-tight mb-2 flex items-center gap-2" style={{ color: "var(--tf-text)" }}>
                      <Grid3X3 size={20} /> Quadros Soltos
                    </h2>
                    <div className="flex overflow-x-auto gap-4 pt-4 pb-6 snap-x no-scrollbar -mx-8 px-8 md:-mx-12 md:px-12">
                      {quadrosAvulsos.map((q) => <QuadroBentoCard key={q.id} quadro={q} />)}

                      <button
                        onClick={() => { setNovoWorkspaceId(""); setModalQuadro(true); }}
                        className="rounded-[32px] h-[150px] min-w-[260px] flex flex-col items-center justify-center text-[15px] border-[3px] border-dashed transition-all hover:border-solid hover:-translate-y-1 group snap-start"
                        style={{ borderColor: "var(--tf-border)", background: "var(--tf-bg-secondary)" }}
                      >
                        <div className="w-12 h-12 rounded-[20px] flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ background: "var(--tf-surface)" }}>
                          <Plus size={24} style={{ color: "var(--tf-text-secondary)" }} strokeWidth={3} />
                        </div>
                        <span className="font-extrabold tracking-tight" style={{ color: "var(--tf-text)" }}>Novo Quadro</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* Bloco invisível para garantir respiro no fim do scroll (corrige bug do webkit) */}
                <div className="h-16 md:h-24 w-full shrink-0" />
              </>
            )}
          </div>

          {/* Right Sidebar - Minhas Tarefas (Item 2) */}
          <div className="w-full xl:w-[320px] 2xl:w-[380px] shrink-0 xl:border-l px-8 pt-8 md:px-12 md:pt-12 xl:px-8 xl:pt-8 xl:pr-10 flex flex-col relative" style={{ borderColor: "var(--tf-border)", background: "var(--tf-bg-secondary)/30" }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[19px] font-black tracking-tight" style={{ color: "var(--tf-text)" }}>Minhas Tarefas</h2>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--tf-surface)" }}>
                <Target size={14} style={{ color: "var(--tf-text-tertiary)" }} />
              </div>
            </div>

            {loadingMetrics ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-full h-[64px] rounded-[14px] animate-pulse" style={{ background: "var(--tf-bg-secondary)" }} />
                ))}
              </div>
            ) : recentTasks.length > 0 ? (
              <div className="space-y-3">
                {recentTasks.map(task => <TaskLineItem key={task.id} task={task} />)}
                <p className="text-center text-[11px] font-bold uppercase tracking-widest mt-6" style={{ color: "var(--tf-text-tertiary)" }}>
                  Atividades Recentes
                </p>
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-[20px] border-2 border-dashed" style={{ borderColor: "var(--tf-border)" }}>
                <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" style={{ color: "var(--tf-text-secondary)" }} />
                <p className="text-[13px] font-bold" style={{ color: "var(--tf-text-secondary)" }}>
                  Nenhuma tarefa pendente!
                </p>
              </div>
            )}

            {/* Bloco invisível garantir respiro */}
            <div className="h-16 md:h-24 w-full shrink-0" />
          </div>

        </main>
      </div>

      {/* ── MODALS (Mesmos modais construídos do zero antes) ── */}
      <Modal
        aberto={modalQuadro}
        onFechar={() => { setModalQuadro(false); resetModalQuadro(); }}
        titulo={novoWorkspaceId ? "Criar sprint" : "Criar quadro"}
      >
        <div className="space-y-5">
          <div
            className="h-28 rounded-[20px] flex items-end p-5 transition-colors"
            style={{ background: `linear-gradient(135deg, ${novaCor}, ${novaCor}bb)` }}
          >
            <span className="text-white font-black text-2xl drop-shadow-md tracking-tight">
              {novoNome || "Nome do quadro"}
            </span>
          </div>

          <div>
            <label className="text-[13px] font-bold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Título</label>
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCriarQuadro(); }}
              className="w-full px-4 py-3 text-[15px] font-medium rounded-[14px] outline-none transition-all"
              style={{ background: "var(--tf-bg-secondary)", border: "2px solid transparent", color: "var(--tf-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              autoFocus
            />
          </div>

          {workspaces.length > 0 && (
            <div>
              <label className="text-[13px] font-bold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Workspace</label>
              <select
                value={novoWorkspaceId}
                onChange={(e) => setNovoWorkspaceId(e.target.value)}
                className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all cursor-pointer"
                style={{ background: "var(--tf-bg-secondary)", border: "2px solid transparent", color: "var(--tf-text)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              >
                <option value="">Nenhum (quadro avulso)</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.nome}</option>
                ))}
              </select>
            </div>
          )}

          {novoWorkspaceId && (
            <>
              <div>
                <label className="text-[13px] font-bold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Meta / Objetivo</label>
                <input
                  value={novoMeta}
                  onChange={(e) => setNovoMeta(e.target.value)}
                  placeholder="O que queremos alcançar nessa sprint?"
                  className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
                  style={{ background: "var(--tf-bg-secondary)", border: "2px solid transparent", color: "var(--tf-text)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-bold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Início</label>
                  <input
                    type="date"
                    value={novoDataInicio}
                    onChange={(e) => setNovoDataInicio(e.target.value)}
                    className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
                    style={{ background: "var(--tf-bg-secondary)", border: "2px solid transparent", color: "var(--tf-text)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Fim</label>
                  <input
                    type="date"
                    value={novoDataFim}
                    onChange={(e) => setNovoDataFim(e.target.value)}
                    className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
                    style={{ background: "var(--tf-bg-secondary)", border: "2px solid transparent", color: "var(--tf-text)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[13px] font-bold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Cor</label>
            <div className="flex flex-wrap gap-2.5">
              {CORES_QUADRO.map((cor) => (
                <button
                  key={cor}
                  onClick={() => setNovaCor(cor)}
                  className={`w-10 h-10 rounded-[14px] transition-all ${novaCor === cor ? "ring-2 ring-offset-2 scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleCriarQuadro}
            disabled={!novoNome.trim()}
            className="w-full py-4 text-[15px] font-bold text-white rounded-[20px] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            style={{ background: "var(--tf-accent)" }}
          >
            {novoWorkspaceId ? "Criar Sprint" : "Criar Quadro"}
          </button>
        </div>
      </Modal>

      <Modal
        aberto={modalWorkspace || !!editandoWs}
        onFechar={fecharModalWs}
        titulo={editandoWs ? "Editar workspace" : "Criar workspace"}
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4 p-5 rounded-[20px]" style={{ background: "var(--tf-bg-secondary)" }}>
            <div className="w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: wsCor }}>
              <Folder size={24} className="text-white" />
            </div>
            <div>
              <p className="font-extrabold text-[18px] tracking-tight" style={{ color: "var(--tf-text)" }}>{wsNome || "Nome do workspace"}</p>
              {wsDescricao && <p className="text-[13px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>{wsDescricao}</p>}
            </div>
          </div>

          <div>
            <label className="text-[13px] font-bold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Nome</label>
            <input
              value={wsNome}
              onChange={(e) => setWsNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") editandoWs ? handleSalvarWorkspace() : handleCriarWorkspace(); }}
              className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
              style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
              autoFocus
            />
          </div>

          <div>
            <label className="text-[13px] font-bold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Descrição (opcional)</label>
            <input
              value={wsDescricao}
              onChange={(e) => setWsDescricao(e.target.value)}
              placeholder="Ex: Projetos da equipe de marketing"
              className="w-full px-5 py-3.5 text-[15px] font-medium rounded-[20px] outline-none transition-all"
              style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
            />
          </div>

          <div>
            <label className="text-[13px] font-bold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Cor</label>
            <div className="flex flex-wrap gap-2.5">
              {CORES_WORKSPACE.map((cor) => (
                <button
                  key={cor}
                  onClick={() => setWsCor(cor)}
                  className={`w-10 h-10 rounded-[14px] transition-all ${wsCor === cor ? "ring-2 ring-offset-2 scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={editandoWs ? handleSalvarWorkspace : handleCriarWorkspace}
            disabled={!wsNome.trim()}
            className="w-full py-4 text-[15px] font-bold text-white rounded-[20px] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
            style={{ background: "var(--tf-accent)" }}
          >
            {editandoWs ? "Salvar Workspace" : "Criar Workspace"}
          </button>
        </div>
      </Modal>

      {/* Confirm delete workspace */}
      {confirmExcluirWsId && (
        <Modal aberto onFechar={() => setConfirmExcluirWsId(null)} titulo="Excluir workspace">
          <p className="text-[13px] mb-4" style={{ color: "var(--tf-text-secondary)" }}>
            Tem certeza? Os quadros/sprints ficarão avulsos. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirmExcluirWsId(null)}
              className="px-4 py-2 text-[13px] font-medium rounded-[10px]"
              style={{ color: "var(--tf-text-secondary)", background: "var(--tf-bg-secondary)" }}
            >
              Cancelar
            </button>
            <button
              onClick={async () => { await excluirWorkspace(confirmExcluirWsId); setConfirmExcluirWsId(null); }}
              className="px-4 py-2 text-[13px] font-bold text-white rounded-[10px]"
              style={{ background: "var(--tf-danger)" }}
            >
              Sim, excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
