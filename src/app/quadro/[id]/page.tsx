"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { KanbanBoard } from "@/components/quadro/kanban-board";
import { Modal } from "@/components/ui/modal";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { StatusSprint } from "@/types";
import {
  Calendar,
  CheckCircle2,
  Folder,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Settings,
  Target,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRealtimeBoard } from "@/hooks/use-realtime";

function diasRestantes(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const diff = new Date(dataFim).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatarData(data: string | null): string {
  if (!data) return "";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

const STATUS_LABELS: Record<StatusSprint, string> = {
  planejada: "Planejada",
  ativa: "Ativa",
  concluida: "Concluída",
};

function statusColor(s: StatusSprint) {
  if (s === "ativa") return "var(--tf-success)";
  if (s === "concluida") return "var(--tf-text-tertiary)";
  return "var(--tf-warning)";
}

function statusBg(s: StatusSprint) {
  if (s === "ativa") return "var(--tf-success-bg)";
  if (s === "concluida") return "var(--tf-bg-secondary)";
  return "var(--tf-warning-bg)";
}

export default function PaginaQuadro() {
  const params = useParams();
  const router = useRouter();
  const quadroId = params.id as string;
  const { quadros, atualizar, excluir } = useQuadros();
  const { workspaces } = useWorkspaces();
  const quadro = quadros.find((q) => q.id === quadroId);
  useRealtimeBoard(quadroId);
  const workspace = quadro?.workspace_id
    ? workspaces.find((w) => w.id === quadro.workspace_id)
    : null;

  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState("");
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();
  const [modalConfig, setModalConfig] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [editMeta, setEditMeta] = useState("");
  const [editInicio, setEditInicio] = useState("");
  const [editFim, setEditFim] = useState("");

  const dias = quadro ? diasRestantes(quadro.data_fim) : null;

  useEffect(() => {
    if (!telaCheia) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTelaCheia(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [telaCheia]);
  const isSprint = !!quadro?.workspace_id;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (quadro && modalConfig) {
      setEditMeta(quadro.meta || "");
      setEditInicio(quadro.data_inicio || "");
      setEditFim(quadro.data_fim || "");
    }
  }, [quadro, modalConfig]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function iniciarEdicao() {
    if (!quadro) return;
    setNome(quadro.nome);
    setEditandoNome(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function salvarNome() {
    const n = nome.trim();
    if (n && quadro && n !== quadro.nome) atualizar(quadro.id, { nome: n });
    setEditandoNome(false);
  }

  async function mudarStatus(status: StatusSprint) {
    if (!quadro) return;
    if (status === "ativa" && quadro.workspace_id) {
      const outraAtiva = quadros.find(
        (q) =>
          q.workspace_id === quadro.workspace_id &&
          q.status_sprint === "ativa" &&
          q.id !== quadro.id
      );
      if (outraAtiva) {
        await atualizar(outraAtiva.id, { status_sprint: "planejada" });
      }
    }
    atualizar(quadro.id, { status_sprint: status });
  }

  async function salvarConfigSprint() {
    if (!quadro) return;
    atualizar(quadro.id, {
      meta: editMeta.trim() || null,
      data_inicio: editInicio || null,
      data_fim: editFim || null,
    });
    setModalConfig(false);
  }

  async function handleExcluir() {
    if (!quadro) return;
    await excluir(quadro.id);
    router.push(workspace ? `/workspace/${workspace.id}` : "/");
  }

  const headerBtnStyle = {
    color: "var(--tf-text-tertiary)",
    borderRadius: "var(--tf-radius-xs)",
  };

  return (
    <div
      className="h-full flex overflow-hidden"
      style={{ background: "var(--tf-bg)" }}
    >
      {iniciado && !telaCheia && (
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => router.push("/dashboard")}
          aberta={sidebarAberta}
          onToggle={toggleSidebar}
        />
      )}

      <main
        id="main-content"
        className={`flex-1 flex flex-col overflow-hidden ${telaCheia ? "p-3" : "px-2 lg:px-4"}`}
      >
        {!telaCheia && <Header onMenuMobile={toggleSidebar} />}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-xl)",
            marginBottom: telaCheia ? 0 : 14,
          }}
        >
          {/* Board header */}
          {quadro && (
            <div className="shrink-0" style={{ borderBottom: "1px solid var(--tf-border)" }}>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-2 md:gap-3 px-3 md:px-4 py-2.5">
                {/* Left: Breadcrumb + Name */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0 order-1">
                  <div
                    className="w-7 h-7 flex items-center justify-center shrink-0"
                    style={{
                      background: quadro.cor,
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    <Folder size={13} className="text-white" strokeWidth={1.75} />
                  </div>

                  <div className="min-w-0 flex items-center gap-1.5 leading-none">
                    {workspace && (
                      <>
                        <Link
                          href={`/workspace/${workspace.id}`}
                          className="text-[0.75rem] transition-colors hover:text-[var(--tf-accent)]"
                          style={{
                            color: "var(--tf-text-tertiary)",
                            fontFamily: "var(--tf-font-mono)",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {workspace.nome}
                        </Link>
                        <span
                          style={{
                            color: "var(--tf-border-strong)",
                            fontFamily: "var(--tf-font-mono)",
                          }}
                        >
                          /
                        </span>
                      </>
                    )}

                    {editandoNome ? (
                      <input
                        ref={inputRef}
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        onBlur={salvarNome}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") salvarNome();
                          if (e.key === "Escape") setEditandoNome(false);
                        }}
                        className="text-[0.875rem] font-semibold px-1.5 py-0.5 outline-none"
                        style={{
                          color: "var(--tf-text)",
                          background: "var(--tf-surface)",
                          border: "1px solid var(--tf-accent)",
                          borderRadius: "var(--tf-radius-xs)",
                          letterSpacing: "-0.01em",
                        }}
                      />
                    ) : (
                      <h1
                        className="text-[0.875rem] font-semibold truncate cursor-pointer transition-colors hover:text-[var(--tf-accent)]"
                        style={{
                          color: "var(--tf-text)",
                          letterSpacing: "-0.01em",
                        }}
                        onClick={iniciarEdicao}
                        title="Clique para renomear"
                      >
                        {quadro.nome}
                      </h1>
                    )}
                  </div>
                </div>

                {/* Center: Status + Date pills */}
                <div className="order-3 md:order-2 w-full md:w-auto flex items-center gap-1.5 flex-wrap shrink-0">
                  {isSprint && (
                    <Dropdown
                      trigger={
                        <button
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.625rem] font-medium transition-colors"
                          style={{
                            background: statusBg(quadro.status_sprint),
                            color: statusColor(quadro.status_sprint),
                            border: `1px solid ${statusColor(quadro.status_sprint)}`,
                            borderRadius: "var(--tf-radius-xs)",
                            fontFamily: "var(--tf-font-mono)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5"
                            style={{
                              background: statusColor(quadro.status_sprint),
                              borderRadius: "1px",
                            }}
                          />
                          {STATUS_LABELS[quadro.status_sprint]}
                        </button>
                      }
                    >
                      {quadro.status_sprint !== "ativa" && (
                        <DropdownItem onClick={() => mudarStatus("ativa")}>
                          <Play size={12} strokeWidth={1.75} /> Ativar sprint
                        </DropdownItem>
                      )}
                      {quadro.status_sprint === "ativa" && (
                        <DropdownItem onClick={() => mudarStatus("planejada")}>
                          <Pause size={12} strokeWidth={1.75} /> Pausar
                        </DropdownItem>
                      )}
                      {quadro.status_sprint !== "concluida" && (
                        <DropdownItem onClick={() => mudarStatus("concluida")}>
                          <CheckCircle2 size={12} strokeWidth={1.75} /> Concluir sprint
                        </DropdownItem>
                      )}
                      {quadro.status_sprint === "concluida" && (
                        <DropdownItem onClick={() => mudarStatus("ativa")}>
                          <RotateCcw size={12} strokeWidth={1.75} /> Reativar sprint
                        </DropdownItem>
                      )}
                    </Dropdown>
                  )}

                  {isSprint && (quadro.data_inicio || quadro.data_fim) && (
                    <div
                      className="flex items-center gap-1.5 h-7 px-2.5 text-[0.625rem] font-medium"
                      style={{
                        color: "var(--tf-text-secondary)",
                        background: "var(--tf-bg-secondary)",
                        border: "1px solid var(--tf-border)",
                        borderRadius: "var(--tf-radius-xs)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      <Calendar size={10} strokeWidth={1.75} />
                      <span>
                        {formatarData(quadro.data_inicio)} → {formatarData(quadro.data_fim)}
                      </span>
                      {dias !== null && quadro.status_sprint === "ativa" && (
                        <span
                          className="font-medium"
                          style={{
                            color:
                              dias <= 2
                                ? "var(--tf-danger)"
                                : dias <= 5
                                  ? "var(--tf-warning)"
                                  : "var(--tf-accent)",
                          }}
                        >
                          {dias > 0 ? `${dias}d` : dias === 0 ? "HOJE!" : `${Math.abs(dias)}d atr.`}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="order-2 md:order-3 flex items-center gap-0.5 shrink-0 ml-auto md:ml-0">
                  {isSprint && (
                    <button
                      onClick={() => setModalConfig(true)}
                      className="w-9 h-9 md:w-auto md:h-auto md:p-1.5 flex items-center justify-center transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-text)]"
                      style={headerBtnStyle}
                      title="Configurar sprint"
                    >
                      <Settings size={14} strokeWidth={1.75} />
                    </button>
                  )}
                  <button
                    onClick={() => setTelaCheia(!telaCheia)}
                    className="p-1.5 transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-text)]"
                    style={headerBtnStyle}
                    title={telaCheia ? "Sair do modo foco (Esc)" : "Modo foco"}
                  >
                    {telaCheia ? (
                      <Minimize2 size={14} strokeWidth={1.75} />
                    ) : (
                      <Maximize2 size={14} strokeWidth={1.75} />
                    )}
                  </button>
                  <Dropdown
                    trigger={
                      <button
                        className="p-1.5 transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-text)]"
                        style={headerBtnStyle}
                      >
                        <MoreHorizontal size={14} strokeWidth={1.75} />
                      </button>
                    }
                  >
                    <DropdownItem onClick={iniciarEdicao}>
                      <Pencil size={12} strokeWidth={1.75} /> Renomear
                    </DropdownItem>
                    {isSprint && (
                      <DropdownItem onClick={() => setModalConfig(true)}>
                        <Settings size={12} strokeWidth={1.75} /> Configurar sprint
                      </DropdownItem>
                    )}
                    <DropdownItem perigo onClick={handleExcluir}>
                      <Trash2 size={12} strokeWidth={1.75} /> Excluir
                    </DropdownItem>
                  </Dropdown>
                </div>
              </div>

              {/* Meta */}
              {quadro.meta && (
                <div className="flex items-center gap-2 px-4 pb-2.5 -mt-0.5">
                  <Target
                    size={11}
                    strokeWidth={1.75}
                    style={{ color: "var(--tf-text-tertiary)" }}
                  />
                  <p
                    className="text-[0.75rem]"
                    style={{
                      color: "var(--tf-text-secondary)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {quadro.meta}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Board area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              className="flex-1 flex overflow-hidden board-area"
              style={{ background: "var(--tf-bg)" }}
            >
              <KanbanBoard
                quadroId={quadroId}
                workspaceId={quadro?.workspace_id || null}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Configurar Sprint */}
      <Modal
        aberto={modalConfig}
        onFechar={() => setModalConfig(false)}
        titulo="Configurar sprint"
      >
        {quadro && (
          <div className="space-y-4">
            {/* Status atual */}
            <div>
              <label
                className="label-mono mb-2 block"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Status
              </label>
              <div className="flex gap-1">
                {(["planejada", "ativa", "concluida"] as StatusSprint[]).map((s) => {
                  const ativo = quadro.status_sprint === s;
                  return (
                    <button
                      key={s}
                      onClick={() => mudarStatus(s)}
                      className="flex-1 h-8 text-[0.75rem] font-medium transition-colors text-center"
                      style={{
                        background: ativo ? statusColor(s) : "transparent",
                        color: ativo ? "#FFFFFF" : "var(--tf-text-secondary)",
                        border: `1px solid ${ativo ? statusColor(s) : "var(--tf-border)"}`,
                        borderRadius: "var(--tf-radius-xs)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                      }}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meta */}
            <div>
              <label
                className="label-mono mb-1.5 block"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Meta / Objetivo
              </label>
              <input
                value={editMeta}
                onChange={(e) => setEditMeta(e.target.value)}
                placeholder="O que queremos alcançar nessa sprint?"
                className="sprint-input w-full h-9 px-3 text-[0.8125rem] outline-none"
                style={{
                  color: "var(--tf-text)",
                  letterSpacing: "-0.005em",
                  borderRadius: "var(--tf-radius-xs)",
                }}
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  className="label-mono mb-1.5 block"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Data início
                </label>
                <input
                  type="date"
                  value={editInicio}
                  onChange={(e) => setEditInicio(e.target.value)}
                  className="sprint-input w-full h-9 px-3 text-[0.8125rem] outline-none"
                  style={{
                    color: "var(--tf-text)",
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                  }}
                />
              </div>
              <div>
                <label
                  className="label-mono mb-1.5 block"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  Data fim
                </label>
                <input
                  type="date"
                  value={editFim}
                  onChange={(e) => setEditFim(e.target.value)}
                  className="sprint-input w-full h-9 px-3 text-[0.8125rem] outline-none"
                  style={{
                    color: "var(--tf-text)",
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                  }}
                />
              </div>
            </div>

            <style jsx>{`
              .sprint-input {
                background: var(--tf-surface);
                border: 1px solid var(--tf-border);
                transition: border-color 0.15s ease;
              }
              .sprint-input:focus {
                border-color: var(--tf-accent);
              }
            `}</style>

            <button
              onClick={salvarConfigSprint}
              className="w-full h-9 text-[0.8125rem] font-medium text-white transition-colors hover:brightness-110"
              style={{
                background: "var(--tf-accent)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              Salvar alterações
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
