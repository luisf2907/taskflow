"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { KanbanBoard } from "@/components/quadro/kanban-board";
import { Modal } from "@/components/ui/modal";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { StatusSprint } from "@/types";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Folder,
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

function diasRestantes(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const diff = new Date(dataFim).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatarData(data: string | null): string {
  if (!data) return "";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function PaginaQuadro() {
  const params = useParams();
  const router = useRouter();
  const quadroId = params.id as string;
  const { quadros, atualizar, excluir } = useQuadros();
  const { workspaces } = useWorkspaces();
  const quadro = quadros.find((q) => q.id === quadroId);
  const workspace = quadro?.workspace_id ? workspaces.find((w) => w.id === quadro.workspace_id) : null;

  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState("");
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [modalConfig, setModalConfig] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Campos editáveis da sprint
  const [editMeta, setEditMeta] = useState("");
  const [editInicio, setEditInicio] = useState("");
  const [editFim, setEditFim] = useState("");

  const dias = quadro ? diasRestantes(quadro.data_fim) : null;
  const isSprint = !!quadro?.workspace_id;

  useEffect(() => {
    if (quadro && modalConfig) {
      setEditMeta(quadro.meta || "");
      setEditInicio(quadro.data_inicio || "");
      setEditFim(quadro.data_fim || "");
    }
  }, [quadro, modalConfig]);

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

    // Se ativando, desativar qualquer outra sprint ativa do mesmo workspace
    if (status === "ativa" && quadro.workspace_id) {
      const outraAtiva = quadros.find(
        (q) => q.workspace_id === quadro.workspace_id && q.status_sprint === "ativa" && q.id !== quadro.id
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

  return (
    <div className="h-full flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar quadros={quadros} onNovoQuadro={() => router.push("/")} aberta={sidebarAberta} onToggle={() => setSidebarAberta(!sidebarAberta)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Board header */}
          {quadro && (
            <div className="shrink-0 border-b" style={{ borderColor: "var(--tf-border)", background: "var(--tf-bg)" }}>
              <div className="flex items-center gap-3 px-5 py-2.5">
                {/* Breadcrumb */}
                {workspace && (
                  <div className="flex items-center gap-1.5 mr-1">
                    <Link href={`/workspace/${workspace.id}`} className="flex items-center gap-1.5 text-[12px] font-medium transition-smooth hover:underline" style={{ color: "var(--tf-text-tertiary)" }}>
                      <Folder size={12} />
                      {workspace.nome}
                    </Link>
                    <ChevronRight size={12} style={{ color: "var(--tf-text-tertiary)" }} />
                  </div>
                )}

                {/* Cor + Nome */}
                <div className="w-3 h-6 rounded-full shrink-0" style={{ background: quadro.cor }} />

                {editandoNome ? (
                  <input
                    ref={inputRef} value={nome} onChange={(e) => setNome(e.target.value)}
                    onBlur={salvarNome}
                    onKeyDown={(e) => { if (e.key === "Enter") salvarNome(); if (e.key === "Escape") setEditandoNome(false); }}
                    className="text-base font-bold rounded-md px-2 py-0.5 outline-none"
                    style={{ color: "var(--tf-text)", background: "var(--tf-surface)", border: "2px solid var(--tf-accent)" }}
                  />
                ) : (
                  <h1 className="text-base font-bold" style={{ color: "var(--tf-text)" }}>{quadro.nome}</h1>
                )}

                {/* Status badge clicável */}
                {isSprint && (
                  <Dropdown
                    trigger={
                      <button
                        className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-smooth hover:opacity-80"
                        style={{
                          background: quadro.status_sprint === "ativa" ? "var(--tf-success-bg)" : quadro.status_sprint === "concluida" ? "var(--tf-bg-secondary)" : "var(--tf-warning-bg)",
                          color: quadro.status_sprint === "ativa" ? "var(--tf-success)" : quadro.status_sprint === "concluida" ? "var(--tf-text-tertiary)" : "var(--tf-warning)",
                        }}
                      >
                        {quadro.status_sprint === "ativa" ? "● Ativa" : quadro.status_sprint === "concluida" ? "Concluída" : "Planejada"}
                      </button>
                    }
                  >
                    {quadro.status_sprint !== "ativa" && (
                      <DropdownItem onClick={() => mudarStatus("ativa")}>
                        <Play size={14} /> Ativar sprint
                      </DropdownItem>
                    )}
                    {quadro.status_sprint === "ativa" && (
                      <DropdownItem onClick={() => mudarStatus("planejada")}>
                        <Pause size={14} /> Pausar (voltar pra planejada)
                      </DropdownItem>
                    )}
                    {quadro.status_sprint !== "concluida" && (
                      <DropdownItem onClick={() => mudarStatus("concluida")}>
                        <CheckCircle2 size={14} /> Concluir sprint
                      </DropdownItem>
                    )}
                    {quadro.status_sprint === "concluida" && (
                      <DropdownItem onClick={() => mudarStatus("ativa")}>
                        <RotateCcw size={14} /> Reativar sprint
                      </DropdownItem>
                    )}
                  </Dropdown>
                )}

                {/* Sprint dates */}
                {isSprint && (quadro.data_inicio || quadro.data_fim) && (
                  <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
                    <Calendar size={12} />
                    <span>{formatarData(quadro.data_inicio)} → {formatarData(quadro.data_fim)}</span>
                    {dias !== null && quadro.status_sprint === "ativa" && (
                      <span className="font-semibold" style={{ color: dias <= 2 ? "var(--tf-danger)" : dias <= 5 ? "var(--tf-warning)" : "var(--tf-text-secondary)" }}>
                        · {dias > 0 ? `${dias}d` : dias === 0 ? "Hoje!" : `${Math.abs(dias)}d atrasada`}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="ml-auto flex items-center gap-1">
                  {isSprint && (
                    <button
                      onClick={() => setModalConfig(true)}
                      className="p-1.5 rounded-md transition-smooth"
                      style={{ color: "var(--tf-text-tertiary)" }}
                      title="Configurar sprint"
                    >
                      <Settings size={16} />
                    </button>
                  )}
                  <Dropdown
                    trigger={<button className="p-1.5 rounded-md transition-smooth" style={{ color: "var(--tf-text-tertiary)" }}><MoreHorizontal size={18} /></button>}
                  >
                    <DropdownItem onClick={iniciarEdicao}><Pencil size={14} /> Renomear</DropdownItem>
                    {isSprint && <DropdownItem onClick={() => setModalConfig(true)}><Settings size={14} /> Configurar sprint</DropdownItem>}
                    <DropdownItem perigo onClick={handleExcluir}><Trash2 size={14} /> Excluir</DropdownItem>
                  </Dropdown>
                </div>
              </div>

              {/* Meta */}
              {quadro.meta && (
                <div className="flex items-center gap-2 px-5 pb-2.5 -mt-0.5">
                  <Target size={12} style={{ color: "var(--tf-text-tertiary)" }} />
                  <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>{quadro.meta}</p>
                </div>
              )}
            </div>
          )}

          {/* Board area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {quadro && <div className="h-1 shrink-0" style={{ background: quadro.cor }} />}
            <div className="flex-1 flex overflow-hidden board-area" style={{ background: "var(--tf-bg-secondary)" }}>
              <KanbanBoard quadroId={quadroId} />
            </div>
          </div>
        </div>
      </div>

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
              <label className="text-[12px] font-semibold mb-2 block" style={{ color: "var(--tf-text-secondary)" }}>Status</label>
              <div className="flex gap-2">
                {(["planejada", "ativa", "concluida"] as StatusSprint[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => mudarStatus(s)}
                    className="flex-1 py-2 text-[13px] font-semibold rounded-lg transition-smooth text-center"
                    style={{
                      background: quadro.status_sprint === s
                        ? s === "ativa" ? "var(--tf-success)" : s === "concluida" ? "var(--tf-text-tertiary)" : "var(--tf-warning)"
                        : "var(--tf-bg-secondary)",
                      color: quadro.status_sprint === s ? "#fff" : "var(--tf-text-secondary)",
                      border: quadro.status_sprint === s ? "none" : "1px solid var(--tf-border)",
                    }}
                  >
                    {s === "planejada" ? "Planejada" : s === "ativa" ? "Ativa" : "Concluida"}
                  </button>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div>
              <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Meta / Objetivo</label>
              <input
                value={editMeta}
                onChange={(e) => setEditMeta(e.target.value)}
                placeholder="O que queremos alcançar nessa sprint?"
                className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
                style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Data Início</label>
                <input
                  type="date"
                  value={editInicio}
                  onChange={(e) => setEditInicio(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
                  style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: "var(--tf-text-secondary)" }}>Data Fim</label>
                <input
                  type="date"
                  value={editFim}
                  onChange={(e) => setEditFim(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-smooth"
                  style={{ background: "var(--tf-bg-secondary)", border: "2px solid var(--tf-border)", color: "var(--tf-text)" }}
                />
              </div>
            </div>

            {/* Salvar */}
            <button
              onClick={salvarConfigSprint}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-smooth"
              style={{ background: "var(--tf-accent)" }}
            >
              Salvar alterações
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
