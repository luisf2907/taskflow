"use client";

import { useAnexos } from "@/hooks/use-anexos";
import { useCartaoEtiquetas } from "@/hooks/use-cartao-etiquetas";
import { useCartaoMembros } from "@/hooks/use-cartao-membros";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { useChecklists } from "@/hooks/use-checklists";
import { useComentarios } from "@/hooks/use-comentarios";
import { Etiqueta, Membro } from "@/types";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronRight,
  Gauge,
  MoreHorizontal,
  Paperclip,
  Tag,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Anexos } from "./anexos";
import { Avatar } from "./avatar";
import { ChecklistComponent } from "./checklist";
import { Comentarios } from "./comentarios";
import { SeletorData, formatarData, statusData } from "./seletor-data";
import { SeletorEtiquetas } from "./seletor-etiquetas";
import { SeletorMembros } from "./seletor-membros";
import { SeletorPeso } from "./seletor-peso";

interface DetalheCartaoProps {
  cartao: CartaoComResumo | null;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onFechar: () => void;
  onAtualizar: (id: string, campos: Record<string, unknown>) => void;
  onExcluir: (id: string) => void;
  onCriarEtiqueta: (nome: string, cor: string) => void;
  onExcluirEtiqueta: (id: string) => void;
  onCriarMembro: (nome: string, email?: string) => void;
  onRefresh: () => void;
}

type Painel = "etiquetas" | "membros" | "data" | "peso" | null;

export function DetalheCartao({
  cartao, etiquetas, membros, onFechar, onAtualizar, onExcluir,
  onCriarEtiqueta, onExcluirEtiqueta, onCriarMembro, onRefresh,
}: DetalheCartaoProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editandoDescricao, setEditandoDescricao] = useState(false);
  const [painelAberto, setPainelAberto] = useState<Painel>(null);

  // Estado local para feedback visual imediato
  const [pesoLocal, setPesoLocal] = useState<number | null>(null);
  const [dataLocal, setDataLocal] = useState<string | null>(null);

  const { etiquetaIds, toggle: toggleEtiqueta } = useCartaoEtiquetas(cartao?.id || null);
  const { membroIds, toggle: toggleMembro } = useCartaoMembros(cartao?.id || null);
  const { checklists, criarChecklist, excluirChecklist, criarItem, toggleItem, excluirItem } = useChecklists(cartao?.id || null);
  const { comentarios, criar: criarComentario, excluir: excluirComentario } = useComentarios(cartao?.id || null);
  const { anexos, enviando, upload: uploadAnexo, excluir: excluirAnexo } = useAnexos(cartao?.id || null);

  useEffect(() => {
    if (cartao) {
      setTitulo(cartao.titulo);
      setDescricao(cartao.descricao || "");
      setPesoLocal(cartao.peso);
      setDataLocal(cartao.data_entrega);
      setPainelAberto(null);
      setEditandoDescricao(false);
    }
  }, [cartao]);

  function salvar() {
    if (!cartao) return;
    onAtualizar(cartao.id, { titulo: titulo.trim() || cartao.titulo, descricao: descricao.trim() || null });
  }

  function handleMudarPeso(peso: number | null) {
    setPesoLocal(peso);
    if (cartao) onAtualizar(cartao.id, { peso });
  }

  function handleMudarData(data: string | null) {
    setDataLocal(data);
    if (cartao) onAtualizar(cartao.id, { data_entrega: data });
  }

  function handleFechar() { salvar(); onRefresh(); onFechar(); }

  if (!cartao) return null;

  const etiquetasDoCartao = etiquetas.filter((e) => etiquetaIds.includes(e.id));
  const membrosDoCartao = membros.filter((m) => membroIds.includes(m.id));
  const dataStatus = statusData(dataLocal);

  // Checklist totals
  const totalItens = checklists.reduce((sum, cl) => sum + cl.checklist_itens.length, 0);
  const totalConcluidos = checklists.reduce((sum, cl) => sum + cl.checklist_itens.filter((i) => i.concluido).length, 0);
  const percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleFechar} />

      <div
        className="relative rounded-2xl w-full max-w-4xl my-8 mx-4 z-10 border overflow-hidden"
        style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)", boxShadow: "var(--tf-shadow-lg)" }}
      >
        {/* ─── TOP BAR ─── */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b"
          style={{ borderColor: "var(--tf-border)", background: "var(--tf-bg-secondary)" }}
        >
          <div className="flex items-center gap-2 text-[13px]">
            <span
              className="px-2 py-0.5 rounded-md font-mono font-semibold text-[12px]"
              style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}
            >
              CARD
            </span>
            <ChevronRight size={14} style={{ color: "var(--tf-text-tertiary)" }} />
            <span className="font-medium" style={{ color: "var(--tf-text-secondary)" }}>
              Aberto
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg transition-smooth" style={{ color: "var(--tf-text-tertiary)" }}>
              <MoreHorizontal size={18} />
            </button>
            <button onClick={handleFechar} className="p-1.5 rounded-lg transition-smooth" style={{ color: "var(--tf-text-tertiary)" }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex min-h-[500px]">
          {/* ═══════════════════════════════════════════
              LEFT SIDE — Main Content
              ═══════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto max-h-[75vh]">
            <div className="px-8 py-6 space-y-6">

              {/* TITLE */}
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={salvar}
                className="w-full text-2xl font-bold bg-transparent outline-none rounded-lg px-1 py-0.5 -mx-1 transition-smooth"
                style={{ color: "var(--tf-text)", border: "2px solid transparent" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--tf-accent)"; e.currentTarget.style.background = "var(--tf-bg-secondary)"; }}
                onBlurCapture={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                placeholder="Título do cartão"
              />

              {/* LABELS */}
              {(etiquetasDoCartao.length > 0 || painelAberto === "etiquetas") && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {etiquetasDoCartao.map((e) => (
                    <span
                      key={e.id}
                      className="px-3 py-1 rounded-md text-[12px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: e.cor }}
                    >
                      {e.nome}
                    </span>
                  ))}
                  <button
                    onClick={() => setPainelAberto(painelAberto === "etiquetas" ? null : "etiquetas")}
                    className="px-2 py-1 rounded-md text-[12px] transition-smooth"
                    style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}
                  >
                    + etiqueta
                  </button>
                </div>
              )}

              {/* PANEL: Labels */}
              {painelAberto === "etiquetas" && (
                <div className="p-4 rounded-xl border" style={{ background: "var(--tf-bg-secondary)", borderColor: "var(--tf-border)" }}>
                  <SeletorEtiquetas etiquetas={etiquetas} selecionadas={etiquetaIds} onToggle={toggleEtiqueta} onCriar={onCriarEtiqueta} onExcluir={onExcluirEtiqueta} />
                </div>
              )}

              {/* PANEL: Members */}
              {painelAberto === "membros" && (
                <div className="p-4 rounded-xl border" style={{ background: "var(--tf-bg-secondary)", borderColor: "var(--tf-border)" }}>
                  <SeletorMembros membros={membros} selecionados={membroIds} onToggle={toggleMembro} onCriar={onCriarMembro} />
                </div>
              )}

              {/* PANEL: Date */}
              {painelAberto === "data" && (
                <div className="p-4 rounded-xl border" style={{ background: "var(--tf-bg-secondary)", borderColor: "var(--tf-border)" }}>
                  <SeletorData valor={dataLocal} onChange={handleMudarData} />
                </div>
              )}

              {/* PANEL: Weight */}
              {painelAberto === "peso" && (
                <div className="p-4 rounded-xl border" style={{ background: "var(--tf-bg-secondary)", borderColor: "var(--tf-border)" }}>
                  <SeletorPeso valor={pesoLocal} onChange={handleMudarPeso} />
                </div>
              )}

              {/* ── DESCRIPTION ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlignLeft size={16} style={{ color: "var(--tf-text)" }} />
                  <h3 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--tf-text)" }}>
                    Descrição
                  </h3>
                  {!editandoDescricao && descricao && (
                    <button onClick={() => setEditandoDescricao(true)}
                      className="ml-auto px-3 py-1 text-[12px] font-medium rounded-md transition-smooth"
                      style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}>
                      Editar
                    </button>
                  )}
                </div>
                {editandoDescricao || !descricao ? (
                  <div className="space-y-2">
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Adicione uma descrição detalhada..."
                      className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none min-h-[120px] transition-smooth leading-relaxed"
                      style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text)", border: "2px solid transparent" }}
                      autoFocus={editandoDescricao}
                      onFocus={(e) => { if (!editandoDescricao) setEditandoDescricao(true); e.currentTarget.style.borderColor = "var(--tf-accent)"; e.currentTarget.style.background = "var(--tf-surface)"; }}
                    />
                    {editandoDescricao && (
                      <div className="flex gap-2">
                        <button onClick={() => { salvar(); setEditandoDescricao(false); }}
                          className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition-smooth" style={{ background: "var(--tf-accent)" }}>Salvar</button>
                        <button onClick={() => { setDescricao(cartao.descricao || ""); setEditandoDescricao(false); }}
                          className="px-4 py-1.5 text-sm rounded-lg transition-smooth" style={{ color: "var(--tf-text-secondary)" }}>Cancelar</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="text-sm rounded-xl p-4 cursor-pointer transition-smooth whitespace-pre-wrap leading-relaxed"
                    style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text)" }}
                    onClick={() => setEditandoDescricao(true)}
                  >
                    {descricao}
                  </div>
                )}
              </div>

              {/* ── SUBTASKS / CHECKLISTS ── */}
              {checklists.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare size={16} style={{ color: "var(--tf-text)" }} />
                      <h3 className="text-[13px] font-bold uppercase tracking-wider" style={{ color: "var(--tf-text)" }}>
                        Subtarefas
                      </h3>
                    </div>
                    <span className="text-[12px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>
                      {percentual}% concluído
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: "var(--tf-border)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentual}%`,
                        background: percentual === 100 ? "var(--tf-success)" : "var(--tf-accent)",
                      }}
                    />
                  </div>
                  <div className="space-y-4">
                    {checklists.map((cl) => (
                      <ChecklistComponent key={cl.id} checklist={cl} onToggleItem={toggleItem} onCriarItem={criarItem} onExcluirItem={excluirItem} onExcluirChecklist={excluirChecklist} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── ATTACHMENTS ── */}
              <Anexos anexos={anexos} enviando={enviando} onUpload={uploadAnexo} onExcluir={excluirAnexo} />

              {/* ── COMMENTS ── */}
              <Comentarios comentarios={comentarios} membros={membros} onCriar={criarComentario} onExcluir={excluirComentario} />

            </div>
          </div>

          {/* ═══════════════════════════════════════════
              RIGHT SIDE — Properties Panel
              ═══════════════════════════════════════════ */}
          <div
            className="w-[280px] shrink-0 border-l overflow-y-auto max-h-[75vh]"
            style={{ borderColor: "var(--tf-border)", background: "var(--tf-bg-secondary)" }}
          >
            <div className="p-5 space-y-5">

              {/* Section: Properties */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--tf-accent-text)" }}>
                  Propriedades
                </h4>
                <div className="space-y-0">
                  {/* Assignee / Members */}
                  <button
                    onClick={() => setPainelAberto(painelAberto === "membros" ? null : "membros")}
                    className="w-full flex items-center justify-between py-2.5 px-1 border-b transition-smooth group"
                    style={{ borderColor: "var(--tf-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <User size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[13px]" style={{ color: "var(--tf-text-secondary)" }}>Membros</span>
                    </div>
                    {membrosDoCartao.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        {membrosDoCartao.slice(0, 2).map((m) => (
                          <Avatar key={m.id} membro={m} tamanho="sm" />
                        ))}
                        {membrosDoCartao.length > 2 && (
                          <span className="text-[11px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>
                            +{membrosDoCartao.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>—</span>
                    )}
                  </button>

                  {/* Due Date */}
                  <button
                    onClick={() => setPainelAberto(painelAberto === "data" ? null : "data")}
                    className="w-full flex items-center justify-between py-2.5 px-1 border-b transition-smooth"
                    style={{ borderColor: "var(--tf-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[13px]" style={{ color: "var(--tf-text-secondary)" }}>Data de Entrega</span>
                    </div>
                    {dataLocal ? (
                      <span
                        className="text-[12px] font-semibold px-2 py-0.5 rounded"
                        style={{
                          color: dataStatus === "vencido" ? "#fff" : dataStatus === "proximo" ? "var(--tf-warning)" : "var(--tf-text)",
                          background: dataStatus === "vencido" ? "var(--tf-danger)" : dataStatus === "proximo" ? "var(--tf-warning-bg)" : "transparent",
                        }}
                      >
                        {formatarData(dataLocal!)}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>—</span>
                    )}
                  </button>

                  {/* Labels */}
                  <button
                    onClick={() => setPainelAberto(painelAberto === "etiquetas" ? null : "etiquetas")}
                    className="w-full flex items-center justify-between py-2.5 px-1 border-b transition-smooth"
                    style={{ borderColor: "var(--tf-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[13px]" style={{ color: "var(--tf-text-secondary)" }}>Etiquetas</span>
                    </div>
                    {etiquetasDoCartao.length > 0 ? (
                      <div className="flex gap-1">
                        {etiquetasDoCartao.slice(0, 3).map((e) => (
                          <div key={e.id} className="w-4 h-4 rounded" style={{ background: e.cor }} title={e.nome} />
                        ))}
                        {etiquetasDoCartao.length > 3 && (
                          <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>+{etiquetasDoCartao.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>—</span>
                    )}
                  </button>

                  {/* Story Points */}
                  <button
                    onClick={() => setPainelAberto(painelAberto === "peso" ? null : "peso")}
                    className="w-full flex items-center justify-between py-2.5 px-1 border-b transition-smooth"
                    style={{ borderColor: "var(--tf-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[13px]" style={{ color: "var(--tf-text-secondary)" }}>Story Points</span>
                    </div>
                    {pesoLocal ? (
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold"
                        style={{ background: "var(--tf-surface)", color: "var(--tf-text)", border: "1px solid var(--tf-border)" }}
                      >
                        {pesoLocal}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>—</span>
                    )}
                  </button>

                  {/* Checklist quick */}
                  <button
                    onClick={() => criarChecklist()}
                    className="w-full flex items-center justify-between py-2.5 px-1 transition-smooth"
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare size={14} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[13px]" style={{ color: "var(--tf-text-secondary)" }}>Checklist</span>
                    </div>
                    {totalItens > 0 ? (
                      <span className="text-[12px] font-semibold" style={{ color: percentual === 100 ? "var(--tf-success)" : "var(--tf-text-secondary)" }}>
                        {totalConcluidos}/{totalItens}
                      </span>
                    ) : (
                      <span className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>+ Criar</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Section: Quick Stats */}
              {(anexos.length > 0 || comentarios.length > 0) && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--tf-accent-text)" }}>
                    Atividade
                  </h4>
                  <div className="space-y-2">
                    {anexos.length > 0 && (
                      <div className="flex items-center gap-2 py-1">
                        <Paperclip size={13} style={{ color: "var(--tf-text-tertiary)" }} />
                        <span className="text-[12px]" style={{ color: "var(--tf-text-secondary)" }}>
                          {anexos.length} {anexos.length === 1 ? "anexo" : "anexos"}
                        </span>
                      </div>
                    )}
                    {comentarios.length > 0 && (
                      <div className="flex items-center gap-2 py-1">
                        <Users size={13} style={{ color: "var(--tf-text-tertiary)" }} />
                        <span className="text-[12px]" style={{ color: "var(--tf-text-secondary)" }}>
                          {comentarios.length} {comentarios.length === 1 ? "comentário" : "comentários"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section: Danger */}
              <div className="pt-3 border-t" style={{ borderColor: "var(--tf-border)" }}>
                <button
                  onClick={() => { onExcluir(cartao.id); onFechar(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[13px] font-medium rounded-lg transition-smooth"
                  style={{ color: "var(--tf-danger)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-danger-bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Trash2 size={14} />
                  Excluir cartão
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
