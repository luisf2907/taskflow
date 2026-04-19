"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useQuadros } from "@/hooks/use-quadros";
import { useSidebar } from "@/hooks/use-sidebar";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { useAuth } from "@/hooks/use-auth";
import { Workspace } from "@/types";
import {
  CheckCircle2,
  Grid3X3,
  Layers,
  Plus,
  Target,
  Flame,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { fadeUp, staggerContainer } from "@/lib/motion/presets";
import OnboardingWizard from "@/components/onboarding/onboarding-wizard";
import { EmptyState } from "@/components/ui/empty-state";

import { QuadroBentoCard } from "./_components/quadro-bento-card";
import { WorkspaceBentoCard } from "./_components/workspace-bento-card";
import { TaskLineItem } from "./_components/task-line-item";
import type { NovoQuadroDados } from "./_modais/modal-criar-quadro";

// Modais carregam sob demanda (usuario precisa clicar pra abrir).
// Evita carregar ~40KB de JS no primeiro load do dashboard.
const ModalCriarQuadro = dynamic(
  () => import("./_modais/modal-criar-quadro").then((m) => m.ModalCriarQuadro),
  { ssr: false }
);
const ModalWorkspace = dynamic(
  () => import("./_modais/modal-workspace").then((m) => m.ModalWorkspace),
  { ssr: false }
);
const ModalConfirmExcluirWs = dynamic(
  () => import("./_modais/modal-confirm-excluir-ws").then((m) => m.ModalConfirmExcluirWs),
  { ssr: false }
);

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function PaginaInicial() {
  const { perfil, user } = useAuth();
  const {
    quadros,
    carregando: carregandoQuadros,
    criar: criarQuadro,
  } = useQuadros();
  const {
    workspaces,
    carregando: carregandoWs,
    criar: criarWorkspace,
    atualizar: atualizarWorkspace,
    excluir: excluirWorkspace,
  } = useWorkspaces();
  const { recentTasks, tasksDoneToday, loadingMetrics } = useDashboardMetrics();

  const nomeUsuario =
    perfil?.nome?.split(" ")[0] || user?.email?.split("@")[0] || "Mestre";

  const [modalQuadro, setModalQuadro] = useState(false);
  const [modalQuadroInitialWs, setModalQuadroInitialWs] = useState<string>("");

  const [modalWorkspace, setModalWorkspace] = useState(false);
  const [editandoWs, setEditandoWs] = useState<Workspace | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [confirmExcluirWsId, setConfirmExcluirWsId] = useState<string | null>(
    null
  );

  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();
  const router = useRouter();
  const carregando = carregandoQuadros || carregandoWs;

  // Listener para abrir modais via evento global (sidebar) ou query param.
  // Queries: ?new-workspace=1 abre modal de workspace, ?new-sprint=1 abre
  // modal de sprint (vindo de outras paginas via sidebar).
  useEffect(() => {
    function handleOpenWsModal() { setEditandoWs(null); setModalWorkspace(true); }
    function handleOpenSprintModal() { abrirModalCriarQuadro(); }
    window.addEventListener("open-workspace-modal", handleOpenWsModal);
    window.addEventListener("open-sprint-modal", handleOpenSprintModal);
    const params = new URLSearchParams(window.location.search);
    if (params.get("new-workspace")) {
      handleOpenWsModal();
      window.history.replaceState({}, "", "/dashboard");
    }
    if (params.get("new-sprint")) {
      handleOpenSprintModal();
      window.history.replaceState({}, "", "/dashboard");
    }
    return () => {
      window.removeEventListener("open-workspace-modal", handleOpenWsModal);
      window.removeEventListener("open-sprint-modal", handleOpenSprintModal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Onboarding persistente: usa perfil.onboarding_done (banco) com fallback para localStorage
    const doneNoBanco = perfil?.onboarding_done === true;
    const doneNoLocal = localStorage.getItem("tf_onboarding_done") === "true";
    if (
      !doneNoBanco &&
      !doneNoLocal &&
      workspaces.length === 0 &&
      quadros.length === 0
    ) {
      setShowOnboarding(true);
    }
  }, [workspaces, quadros, perfil?.onboarding_done]);

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
    () =>
      [...quadros]
        .sort(
          (a, b) =>
            new Date(b.atualizado_em).getTime() -
            new Date(a.atualizado_em).getTime()
        )
        .slice(0, 5),
    [quadros]
  );

  function abrirModalCriarQuadro(workspaceId?: string) {
    setModalQuadroInitialWs(workspaceId || workspaces[0]?.id || "");
    setModalQuadro(true);
  }

  async function handleCriarQuadro(dados: NovoQuadroDados) {
    const quadro = await criarQuadro({
      nome: dados.nome,
      cor: dados.cor,
      workspaceId: dados.workspaceId,
      dataInicio: dados.dataInicio,
      dataFim: dados.dataFim,
      statusSprint: "planejada",
      meta: dados.meta,
    });

    if (quadro) {
      const ws = workspaces.find((w) => w.id === dados.workspaceId);
      if (ws?.colunas_padrao && ws.colunas_padrao.length > 0) {
        const { supabase } = await import("@/lib/supabase/client");
        const colunas = ws.colunas_padrao.map((nome, i) => ({
          quadro_id: quadro.id,
          nome,
          posicao: i,
        }));
        await supabase.from("colunas").insert(colunas);
      }

      setModalQuadro(false);
      router.push(`/quadro/${quadro.id}`);
    }
  }

  async function handleCriarWorkspace(
    nome: string,
    descricao: string | undefined,
    cor: string
  ) {
    await criarWorkspace(nome, descricao, cor);
  }

  async function handleSalvarWorkspace(
    id: string,
    campos: { nome: string; descricao: string | null; cor: string }
  ) {
    await atualizarWorkspace(id, campos);
  }

  function fecharModalWs() {
    setModalWorkspace(false);
    setEditandoWs(null);
  }

  return (
    <div
      className="h-full flex overflow-hidden lg:flex-row flex-col"
      style={{ background: "var(--tf-bg)" }}
    >
      {showOnboarding && (
        <OnboardingWizard
          initialStep={
            perfil?.onboarding_step &&
            perfil.onboarding_step > 0 &&
            perfil.onboarding_step < 4
              ? perfil.onboarding_step
              : 1
          }
          onComplete={(wsId) => {
            setShowOnboarding(false);
            router.push(`/workspace/${wsId}`);
          }}
          onSkip={() => {
            setShowOnboarding(false);
          }}
        />
      )}
      {iniciado && (
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => abrirModalCriarQuadro()}
          aberta={sidebarAberta}
          onToggle={toggleSidebar}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header onMenuMobile={toggleSidebar} />

        <div className="flex-1 mb-4 overflow-hidden flex flex-col scroll-clip-lg" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)", borderRadius: "var(--tf-radius-xl)" }}>
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col xl:flex-row gap-8"
        >
          {/* Main Left Content */}
          <div className="flex-1 min-w-0 px-8 pt-10 md:px-12 md:pt-12 flex flex-col relative">
            {carregando ? (
              <div className="flex-1 space-y-8 animate-pulse pt-4">
                {/* Hero skeleton */}
                <div className="flex items-center gap-3">
                  <div
                    className="h-7 w-32"
                    style={{
                      background: "var(--tf-bg-secondary)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  />
                  <div
                    className="h-7 w-24"
                    style={{
                      background: "var(--tf-bg-secondary)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  />
                </div>
                {/* Cards skeleton */}
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-[140px] min-w-[240px] flex-shrink-0"
                      style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)", borderRadius: "var(--tf-radius-md)" }}
                    />
                  ))}
                </div>
                {/* Workspace skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[200px]"
                      style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)", borderRadius: "var(--tf-radius-md)" }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                {/* ── HERO SECTION & INSIGHTS ── */}
                <motion.div variants={fadeUp} className="flex flex-col mb-8 md:mb-10">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.6875rem] font-medium"
                        style={{
                          background: "var(--tf-accent-light)",
                          color: "var(--tf-accent-text)",
                          border: "1px solid var(--tf-accent)",
                          borderRadius: "var(--tf-radius-xs)",
                          fontFamily: "var(--tf-font-mono)",
                          letterSpacing: "0.02em",
                          textTransform: "uppercase",
                        }}
                      >
                        <Activity size={11} strokeWidth={1.75} />
                        {quadros.length} sprints ativas
                      </div>
                      {tasksDoneToday > 0 && (
                        <div
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.6875rem] font-medium"
                          style={{
                            background: "var(--tf-warning-bg)",
                            color: "var(--tf-warning)",
                            border: "1px solid var(--tf-warning)",
                            borderRadius: "var(--tf-radius-xs)",
                            fontFamily: "var(--tf-font-mono)",
                            letterSpacing: "0.02em",
                            textTransform: "uppercase",
                          }}
                        >
                          <Flame size={11} strokeWidth={1.75} />
                          {tasksDoneToday} concluídas hoje
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setModalWorkspace(true)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-[0.75rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
                        style={{
                          background: "var(--tf-surface)",
                          color: "var(--tf-text-secondary)",
                          border: "1px solid var(--tf-border)",
                          borderRadius: "var(--tf-radius-xs)",
                          fontFamily: "var(--tf-font-mono)",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        <Layers size={13} strokeWidth={1.75} />
                        Workspace
                      </button>
                      <button
                        onClick={() => abrirModalCriarQuadro()}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[0.8125rem] font-medium transition-colors hover:brightness-110"
                        style={{
                          background: "var(--tf-accent)",
                          color: "white",
                          border: "1px solid var(--tf-accent)",
                          borderRadius: "var(--tf-radius-xs)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        <Plus size={14} strokeWidth={2} />
                        Nova sprint
                      </button>
                    </div>
                  </div>

                  {/* Context and Titles */}
                  <div>
                    <motion.p
                      variants={fadeUp}
                      className="label-mono mb-2"
                      style={{ color: "var(--tf-text-tertiary)" }}
                    >
                      {saudacao()}
                    </motion.p>
                    <h1
                      className="text-[2.25rem] lg:text-[2.75rem] leading-tight font-semibold"
                      style={{
                        color: "var(--tf-text)",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      Olá, {nomeUsuario}.
                    </h1>
                    <p
                      className="text-[0.875rem] mt-2"
                      style={{
                        color: "var(--tf-text-secondary)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      Seu espaço de trabalho está focado e produtivo.
                    </p>
                  </div>
                </motion.div>

                {/* Empty State Geral */}
                {quadros.length === 0 && workspaces.length === 0 && (
                  <motion.div
                    variants={fadeUp}
                    className="mx-auto w-full max-w-xl"
                    style={{
                      border: "1px dashed var(--tf-border-strong)",
                      background: "var(--tf-bg-secondary)",
                      borderRadius: "var(--tf-radius-md)",
                    }}
                  >
                    <EmptyState
                      ilustracao="workspace"
                      overline="Começo do zero"
                      titulo="O palco está vazio"
                      descricao="Comece sua jornada criando seu primeiro grande projeto ou uma sprint rápida. O que vamos construir hoje?"
                      acaoLabel="Criar workspace"
                      onAcao={() => setModalWorkspace(true)}
                      acaoSecundariaLabel="Quadro avulso"
                      onAcaoSecundaria={() => abrirModalCriarQuadro()}
                    />
                  </motion.div>
                )}

                {/* ── RECENTES (Scroll Horizontal) ── */}
                {recentes.length > 0 && (
                  <motion.section variants={fadeUp} className="mb-8">
                    <h2
                      className="label-mono mb-4 flex items-center gap-2"
                      style={{ color: "var(--tf-text-secondary)" }}
                    >
                      Acessados recentemente
                    </h2>

                    {/* Scroll Horizontal */}
                    <div
                      className="flex overflow-x-auto gap-4 pt-3 pb-3 snap-x no-scrollbar scroll-pl-4 -mx-4 px-4"
                      style={{ overflowY: "visible" }}
                    >
                      {recentes.map((q) => (
                        <QuadroBentoCard key={q.id} quadro={q} />
                      ))}
                    </div>
                  </motion.section>
                )}

                {/* ── WORKSPACES (GRID BENTO) ── */}
                {workspaces.length > 0 && (
                  <motion.section variants={fadeUp} className="mb-8">
                    <h2
                      className="label-mono mb-4"
                      style={{ color: "var(--tf-text-secondary)" }}
                    >
                      Seus projetos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {workspaces.map((ws) => (
                        <WorkspaceBentoCard
                          key={ws.id}
                          ws={ws}
                          qtdQuadros={(quadrosPorWorkspace[ws.id] || []).length}
                          onEditar={(w) => setEditandoWs(w)}
                          onExcluir={(id) => setConfirmExcluirWsId(id)}
                          onNovaSprint={(wsId) => abrirModalCriarQuadro(wsId)}
                        />
                      ))}
                    </div>
                  </motion.section>
                )}

                {/* ── QUADROS AVULSOS ── */}
                {quadrosAvulsos.length > 0 && (
                  <motion.section variants={fadeUp}>
                    <h2
                      className="label-mono mb-3 flex items-center gap-2"
                      style={{ color: "var(--tf-text-secondary)" }}
                    >
                      <Grid3X3 size={12} strokeWidth={1.75} /> Quadros soltos
                    </h2>
                    <div
                      className="flex overflow-x-auto gap-4 pt-3 pb-3 snap-x no-scrollbar scroll-pl-4 -mx-4 px-4"
                      style={{ overflowY: "visible" }}
                    >
                      {quadrosAvulsos.map((q) => (
                        <QuadroBentoCard key={q.id} quadro={q} />
                      ))}

                      <button
                        onClick={() => abrirModalCriarQuadro()}
                        className="h-[140px] min-w-[240px] flex flex-col items-center justify-center gap-2 transition-colors group snap-start"
                        style={{
                          border: "1px dashed var(--tf-border-strong)",
                          background: "var(--tf-bg-secondary)",
                          borderRadius: "var(--tf-radius-md)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "var(--tf-accent)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--tf-border-strong)";
                        }}
                      >
                        <div
                          className="w-9 h-9 flex items-center justify-center transition-colors"
                          style={{
                            background: "var(--tf-surface)",
                            border: "1px solid var(--tf-border)",
                            borderRadius: "var(--tf-radius-xs)",
                            color: "var(--tf-text-tertiary)",
                          }}
                        >
                          <Plus size={16} strokeWidth={1.75} />
                        </div>
                        <span
                          className="text-[0.6875rem] font-medium"
                          style={{
                            color: "var(--tf-text-secondary)",
                            fontFamily: "var(--tf-font-mono)",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          Nova sprint
                        </span>
                      </button>
                    </div>
                  </motion.section>
                )}

                {/* Bloco invisível para garantir respiro no fim do scroll (corrige bug do webkit) */}
                <div className="h-16 md:h-24 w-full shrink-0" />
              </motion.div>
            )}
          </div>

          {/* Right Sidebar - Minhas Tarefas (Item 2) */}
          <div
            className="w-full xl:w-[320px] 2xl:w-[380px] shrink-0 xl:border-l px-8 pt-8 md:px-12 md:pt-12 xl:px-8 xl:pt-8 xl:pr-10 flex flex-col relative"
            style={{
              borderColor: "var(--tf-border)",
              background: "var(--tf-bg-secondary)/30",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="label-mono flex items-center gap-2"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                <Target size={11} strokeWidth={1.75} />
                Minhas tarefas
              </h2>
            </div>

            {loadingMetrics ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-full h-[56px] animate-pulse"
                    style={{
                      background: "var(--tf-bg-secondary)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  />
                ))}
              </div>
            ) : recentTasks.length > 0 ? (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <TaskLineItem key={task.id} task={task} />
                ))}
                <p
                  className="label-mono text-center mt-5"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Atividades recentes
                </p>
              </div>
            ) : (
              <div
                className="text-center py-10 px-4"
                style={{
                  border: "1px dashed var(--tf-border-strong)",
                  borderRadius: "var(--tf-radius-md)",
                }}
              >
                <CheckCircle2
                  size={24}
                  strokeWidth={1.5}
                  className="mx-auto mb-2"
                  style={{ color: "var(--tf-border-strong)" }}
                />
                <p
                  className="text-[0.75rem]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Nenhuma tarefa pendente
                </p>
              </div>
            )}

            {/* Bloco invisível garantir respiro */}
            <div className="h-16 md:h-24 w-full shrink-0" />
          </div>
        </main>
        </div>
      </div>

      {/* ── MODALS ── */}
      <ModalCriarQuadro
        aberto={modalQuadro}
        onFechar={() => setModalQuadro(false)}
        workspaces={workspaces}
        initialWorkspaceId={modalQuadroInitialWs}
        onCriar={handleCriarQuadro}
      />

      <ModalWorkspace
        aberto={modalWorkspace}
        editando={editandoWs}
        onFechar={fecharModalWs}
        onCriar={handleCriarWorkspace}
        onSalvar={handleSalvarWorkspace}
      />

      <ModalConfirmExcluirWs
        workspaceId={confirmExcluirWsId}
        onFechar={() => setConfirmExcluirWsId(null)}
        onConfirmar={async (id) => {
          await excluirWorkspace(id);
        }}
      />
    </div>
  );
}
