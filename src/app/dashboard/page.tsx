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
  Sparkles,
  Target,
  Flame,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import OnboardingWizard from "@/components/onboarding/onboarding-wizard";

import { QuadroBentoCard } from "./_components/quadro-bento-card";
import { WorkspaceBentoCard } from "./_components/workspace-bento-card";
import { TaskLineItem } from "./_components/task-line-item";
import {
  ModalCriarQuadro,
  type NovoQuadroDados,
} from "./_modais/modal-criar-quadro";
import { ModalWorkspace } from "./_modais/modal-workspace";
import { ModalConfirmExcluirWs } from "./_modais/modal-confirm-excluir-ws";

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

        <div className="flex-1 rounded-[32px] mb-4 overflow-hidden flex flex-col scroll-clip-lg" style={{ background: "var(--tf-surface)" }}>
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
                    className="h-8 w-32 rounded-full"
                    style={{ background: "var(--tf-bg-secondary)" }}
                  />
                  <div
                    className="h-8 w-24 rounded-full"
                    style={{ background: "var(--tf-bg-secondary)" }}
                  />
                </div>
                {/* Cards skeleton */}
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-[32px] h-[150px] min-w-[260px] flex-shrink-0"
                      style={{ background: "var(--tf-bg-secondary)" }}
                    />
                  ))}
                </div>
                {/* Workspace skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-[32px] h-[220px]"
                      style={{ background: "var(--tf-bg-secondary)" }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* ── HERO SECTION & INSIGHTS ── */}
                <div className="flex flex-col mb-10 md:mb-14">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="px-3.5 py-1.5 rounded-full text-[12px] font-black tracking-wide flex items-center gap-1.5"
                        style={{
                          background: "var(--tf-accent-light)",
                          color: "var(--tf-accent)",
                        }}
                      >
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
                        onClick={() => setModalWorkspace(true)}
                        className="flex items-center gap-2 justify-center px-5 py-3.5 text-[14px] font-bold rounded-[20px] transition-all"
                        style={{
                          background: "var(--tf-bg-secondary)",
                          color: "var(--tf-text)",
                        }}
                      >
                        <Layers size={18} />
                        Workspace
                      </button>
                      <button
                        onClick={() => abrirModalCriarQuadro()}
                        className="flex items-center gap-2 justify-center px-6 py-3.5 text-[14px] font-bold rounded-[20px] transition-all hover:-translate-y-0.5"
                        style={{
                          background: "var(--tf-accent)",
                          color: "white",
                        }}
                      >
                        <Plus size={18} strokeWidth={2.5} />
                        Nova Sprint
                      </button>
                    </div>
                  </div>

                  {/* Context and Titles */}
                  <div>
                    <h1
                      className="text-4xl lg:text-[44px] leading-tight font-black tracking-tight"
                      style={{ color: "var(--tf-text)" }}
                    >
                      {saudacao()},<br className="xl:hidden" /> {nomeUsuario}.
                    </h1>
                    <p
                      className="text-base mt-3 font-bold"
                      style={{ color: "var(--tf-text-secondary)" }}
                    >
                      Seu espaço de trabalho está focado e produtivo.
                    </p>
                  </div>
                </div>

                {/* Empty State Geral */}
                {quadros.length === 0 && workspaces.length === 0 && (
                  <div
                    className="flex flex-col justify-center items-center text-center py-20 px-6 rounded-[32px] border-2 border-dashed mx-auto w-full max-w-2xl"
                    style={{
                      borderColor: "var(--tf-border)",
                      background: "var(--tf-bg-secondary)",
                    }}
                  >
                    <div
                      className="w-24 h-24 rounded-[32px] flex items-center justify-center mb-6 transform hover:scale-110 transition-transform"
                      style={{ background: "var(--tf-surface)" }}
                    >
                      <Sparkles
                        size={40}
                        style={{ color: "var(--tf-accent)" }}
                      />
                    </div>
                    <h2
                      className="text-3xl font-black mb-3 tracking-tight"
                      style={{ color: "var(--tf-text)" }}
                    >
                      O palco está vazio!
                    </h2>
                    <p
                      className="text-base mb-8 max-w-md font-medium"
                      style={{ color: "var(--tf-text-secondary)" }}
                    >
                      Comece sua jornada criando seu primeiro grande projeto ou
                      uma sprint rápida. O que vamos construir hoje?
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
                        onClick={() => abrirModalCriarQuadro()}
                        className="px-8 py-3.5 font-bold rounded-[20px] transition-all hover:bg-black/5 w-full sm:w-auto"
                        style={{
                          color: "var(--tf-text)",
                          border: "2px solid var(--tf-border)",
                        }}
                      >
                        Quadro Avulso
                      </button>
                    </div>
                  </div>
                )}

                {/* ── RECENTES (Scroll Horizontal) ── */}
                {recentes.length > 0 && (
                  <section className="mb-8">
                    <h2
                      className="text-[19px] font-black tracking-tight mb-5 flex items-center gap-2"
                      style={{ color: "var(--tf-text)" }}
                    >
                      Acessados Recentemente
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
                  </section>
                )}

                {/* ── WORKSPACES (GRID BENTO) ── */}
                {workspaces.length > 0 && (
                  <section className="mb-8">
                    <h2
                      className="text-[19px] font-black tracking-tight mb-6"
                      style={{ color: "var(--tf-text)" }}
                    >
                      Seus Projetos
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
                  </section>
                )}

                {/* ── QUADROS AVULSOS ── */}
                {quadrosAvulsos.length > 0 && (
                  <section>
                    <h2
                      className="text-[19px] font-black tracking-tight mb-2 flex items-center gap-2"
                      style={{ color: "var(--tf-text)" }}
                    >
                      <Grid3X3 size={20} /> Quadros Soltos
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
                        className="rounded-[32px] h-[150px] min-w-[260px] flex flex-col items-center justify-center text-[15px] border-[3px] border-dashed transition-all hover:border-solid hover:-translate-y-1 group snap-start"
                        style={{
                          borderColor: "var(--tf-border)",
                          background: "var(--tf-bg-secondary)",
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-[20px] flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                          style={{ background: "var(--tf-surface)" }}
                        >
                          <Plus
                            size={24}
                            style={{ color: "var(--tf-text-secondary)" }}
                            strokeWidth={3}
                          />
                        </div>
                        <span
                          className="font-extrabold tracking-tight"
                          style={{ color: "var(--tf-text)" }}
                        >
                          Nova Sprint
                        </span>
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
          <div
            className="w-full xl:w-[320px] 2xl:w-[380px] shrink-0 xl:border-l px-8 pt-8 md:px-12 md:pt-12 xl:px-8 xl:pt-8 xl:pr-10 flex flex-col relative"
            style={{
              borderColor: "var(--tf-border)",
              background: "var(--tf-bg-secondary)/30",
            }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2
                className="text-[19px] font-black tracking-tight"
                style={{ color: "var(--tf-text)" }}
              >
                Minhas Tarefas
              </h2>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--tf-surface)" }}
              >
                <Target
                  size={14}
                  style={{ color: "var(--tf-text-tertiary)" }}
                />
              </div>
            </div>

            {loadingMetrics ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-full h-[64px] rounded-[14px] animate-pulse"
                    style={{ background: "var(--tf-bg-secondary)" }}
                  />
                ))}
              </div>
            ) : recentTasks.length > 0 ? (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <TaskLineItem key={task.id} task={task} />
                ))}
                <p
                  className="text-center text-[11px] font-bold uppercase tracking-widest mt-6"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Atividades Recentes
                </p>
              </div>
            ) : (
              <div
                className="text-center py-12 px-4 rounded-[20px] border-2 border-dashed"
                style={{ borderColor: "var(--tf-border)" }}
              >
                <CheckCircle2
                  size={32}
                  className="mx-auto mb-3 opacity-30"
                  style={{ color: "var(--tf-text-secondary)" }}
                />
                <p
                  className="text-[13px] font-bold"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Nenhuma tarefa pendente!
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
