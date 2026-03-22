"use client";

import { useAnexos } from "@/hooks/use-anexos";
import { useCartaoEtiquetas } from "@/hooks/use-cartao-etiquetas";
import { useCartaoMembros } from "@/hooks/use-cartao-membros";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { useChecklists } from "@/hooks/use-checklists";
import { useComentarios } from "@/hooks/use-comentarios";
import { Etiqueta, Membro } from "@/types";
import { mutate as globalMutate } from "swr";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronRight,
  ExternalLink,
  Gauge,
  GitPullRequest,
  Loader2,
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
  quadroId?: string;
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
  cartao, etiquetas, membros, quadroId, onFechar, onAtualizar, onExcluir,
  onCriarEtiqueta, onExcluirEtiqueta, onCriarMembro, onRefresh,
}: DetalheCartaoProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editandoDescricao, setEditandoDescricao] = useState(false);
  const [painelAberto, setPainelAberto] = useState<Painel>(null);

  const [pesoLocal, setPesoLocal] = useState<number | null>(null);
  const [dataLocal, setDataLocal] = useState<string | null>(null);

  const { etiquetaIds, toggle: toggleEtiquetaBase } = useCartaoEtiquetas(cartao?.id || null);
  const { membroIds, toggle: toggleMembroBase } = useCartaoMembros(cartao?.id || null);

  function atualizarCartaoNoCache(updates: Partial<CartaoComResumo>) {
    if (!cartao || !quadroId) return;
    const cacheKey = `cartoes-${quadroId}`;
    globalMutate(cacheKey, (current: CartaoComResumo[] | undefined) => {
      if (!current) return current;
      return current.map(c => c.id === cartao.id ? { ...c, ...updates } : c);
    }, false);
  }

  async function toggleEtiqueta(id: string) {
    const novasIds = etiquetaIds.includes(id)
      ? etiquetaIds.filter(eid => eid !== id)
      : [...etiquetaIds, id];
    atualizarCartaoNoCache({ etiqueta_ids: novasIds });
    await toggleEtiquetaBase(id);
  }

  async function toggleMembro(id: string) {
    const novosIds = membroIds.includes(id)
      ? membroIds.filter(mid => mid !== id)
      : [...membroIds, id];
    atualizarCartaoNoCache({ membro_ids: novosIds });
    await toggleMembroBase(id);
  }

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

  const totalItens = checklists.reduce((sum, cl) => sum + cl.checklist_itens.length, 0);
  const totalConcluidos = checklists.reduce((sum, cl) => sum + cl.checklist_itens.filter((i) => i.concluido).length, 0);
  const percentual = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleFechar} />

      <div
        className="relative rounded-[20px] w-full max-w-4xl my-8 mx-4 z-10 overflow-hidden"
        style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}
      >
        {/* ─── TOP BAR ─── */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            {etiquetasDoCartao.length > 0 && (
              <div className="flex gap-1 mr-2">
                {etiquetasDoCartao.map((e) => (
                  <span
                    key={e.id}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: e.cor }}
                    title={e.nome}
                  />
                ))}
              </div>
            )}
            {pesoLocal && (
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}
              >
                {pesoLocal} pts
              </span>
            )}
            {dataLocal && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  color: dataStatus === "vencido" ? "#fff" : dataStatus === "proximo" ? "var(--tf-warning)" : "var(--tf-text-tertiary)",
                  background: dataStatus === "vencido" ? "var(--tf-danger)" : dataStatus === "proximo" ? "var(--tf-warning-bg)" : "var(--tf-bg-secondary)",
                }}
              >
                {formatarData(dataLocal)}
              </span>
            )}
          </div>
          <button
            onClick={handleFechar}
            className="p-1.5 rounded-[8px] hover:bg-[var(--tf-surface-hover)]"
            style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-[480px]">
          {/* ═══ LEFT — Main Content ═══ */}
          <div className="flex-1 overflow-y-auto max-h-[75vh]">
            <div className="px-8 pb-8 pt-2 space-y-6">

              {/* TITLE */}
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={salvar}
                className="w-full text-[22px] font-bold bg-transparent outline-none rounded-[8px] px-1 py-1 -mx-1"
                style={{ color: "var(--tf-text)", border: "2px solid transparent", transition: "border-color 0.15s ease, background 0.15s ease" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--tf-accent)"; e.currentTarget.style.background = "var(--tf-bg-secondary)"; }}
                onBlurCapture={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                placeholder="Título do cartão"
              />

              {/* LABELS ROW */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {etiquetasDoCartao.map((e) => (
                  <span
                    key={e.id}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: e.cor }}
                  >
                    {e.nome}
                  </span>
                ))}
                <button
                  onClick={() => setPainelAberto(painelAberto === "etiquetas" ? null : "etiquetas")}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium hover:bg-[var(--tf-surface-hover)]"
                  style={{ color: "var(--tf-text-tertiary)", border: "1px dashed var(--tf-border)", transition: "background 0.15s ease" }}
                >
                  + etiqueta
                </button>
              </div>

              {/* INLINE PANELS */}
              {painelAberto === "etiquetas" && (
                <div className="p-4 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
                  <SeletorEtiquetas etiquetas={etiquetas} selecionadas={etiquetaIds} onToggle={toggleEtiqueta} onCriar={onCriarEtiqueta} onExcluir={onExcluirEtiqueta} />
                </div>
              )}

              {painelAberto === "membros" && (
                <div className="p-4 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
                  <SeletorMembros membros={membros} selecionados={membroIds} onToggle={toggleMembro} onCriar={onCriarMembro} />
                </div>
              )}

              {painelAberto === "data" && (
                <div className="p-4 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
                  <SeletorData valor={dataLocal} onChange={handleMudarData} />
                </div>
              )}

              {painelAberto === "peso" && (
                <div className="p-4 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
                  <SeletorPeso valor={pesoLocal} onChange={handleMudarPeso} />
                </div>
              )}

              {/* ── DESCRIPTION ── */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlignLeft size={15} style={{ color: "var(--tf-text-tertiary)" }} />
                  <h3 className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
                    Descrição
                  </h3>
                  {!editandoDescricao && descricao && (
                    <button onClick={() => setEditandoDescricao(true)}
                      className="ml-auto px-2.5 py-1 text-[11px] font-medium rounded-[8px] hover:bg-[var(--tf-surface-hover)]"
                      style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}>
                      Editar
                    </button>
                  )}
                </div>
                {editandoDescricao || !descricao ? (
                  <div className="space-y-2">
                    <textarea
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Adicione uma descrição..."
                      className="w-full rounded-[14px] px-4 py-3 text-sm resize-none outline-none min-h-[100px] leading-relaxed"
                      style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text)", border: "2px solid transparent", transition: "border-color 0.15s ease, background 0.15s ease" }}
                      autoFocus={editandoDescricao}
                      onFocus={(e) => { if (!editandoDescricao) setEditandoDescricao(true); e.currentTarget.style.borderColor = "var(--tf-accent)"; e.currentTarget.style.background = "var(--tf-surface)"; }}
                    />
                    {editandoDescricao && (
                      <div className="flex gap-2">
                        <button onClick={() => { salvar(); setEditandoDescricao(false); }}
                          className="px-4 py-1.5 text-[12px] font-semibold text-white rounded-[8px]" style={{ background: "var(--tf-accent)", transition: "opacity 0.15s ease" }}>Salvar</button>
                        <button onClick={() => { setDescricao(cartao.descricao || ""); setEditandoDescricao(false); }}
                          className="px-4 py-1.5 text-[12px] rounded-[8px] hover:bg-[var(--tf-surface-hover)]" style={{ color: "var(--tf-text-secondary)", transition: "background 0.15s ease" }}>Cancelar</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="text-sm rounded-[14px] p-4 cursor-pointer whitespace-pre-wrap leading-relaxed hover:bg-[var(--tf-surface-hover)]"
                    style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text)", transition: "background 0.15s ease" }}
                    onClick={() => setEditandoDescricao(true)}
                  >
                    {descricao}
                  </div>
                )}
              </div>

              {/* ── PULL REQUEST ── */}
              {cartao.pr_numero && (
                <PainelPR cartao={cartao} onRefresh={onRefresh} />
              )}

              {/* ── SUBTASKS / CHECKLISTS ── */}
              {checklists.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare size={15} style={{ color: "var(--tf-text-tertiary)" }} />
                      <h3 className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
                        Subtarefas
                      </h3>
                    </div>
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: percentual === 100 ? "var(--tf-success)" : "var(--tf-text-tertiary)",
                        background: percentual === 100 ? "var(--tf-success-bg)" : "var(--tf-bg-secondary)",
                      }}
                    >
                      {percentual}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full overflow-hidden mb-4" style={{ background: "var(--tf-border)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percentual}%`,
                        background: percentual === 100 ? "var(--tf-success)" : "var(--tf-accent)",
                        transition: "width 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
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

          {/* ═══ RIGHT — Properties ═══ */}
          <div
            className="w-[260px] shrink-0 border-l overflow-y-auto max-h-[75vh]"
            style={{ borderColor: "var(--tf-border)" }}
          >
            <div className="p-5 space-y-1">

              {/* Property rows */}
              <PropertyRow
                icon={<User size={14} />}
                label="Membros"
                onClick={() => setPainelAberto(painelAberto === "membros" ? null : "membros")}
                active={painelAberto === "membros"}
              >
                {membrosDoCartao.length > 0 ? (
                  <div className="flex items-center gap-1">
                    {membrosDoCartao.slice(0, 3).map((m) => (
                      <Avatar key={m.id} membro={m} tamanho="sm" />
                    ))}
                    {membrosDoCartao.length > 3 && (
                      <span className="text-[10px] font-bold" style={{ color: "var(--tf-text-tertiary)" }}>
                        +{membrosDoCartao.length - 3}
                      </span>
                    )}
                  </div>
                ) : null}
              </PropertyRow>

              <PropertyRow
                icon={<Calendar size={14} />}
                label="Data"
                onClick={() => setPainelAberto(painelAberto === "data" ? null : "data")}
                active={painelAberto === "data"}
              >
                {dataLocal ? (
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: dataStatus === "vencido" ? "#fff" : dataStatus === "proximo" ? "var(--tf-warning)" : "var(--tf-text-secondary)",
                      background: dataStatus === "vencido" ? "var(--tf-danger)" : dataStatus === "proximo" ? "var(--tf-warning-bg)" : "var(--tf-bg-secondary)",
                    }}
                  >
                    {formatarData(dataLocal)}
                  </span>
                ) : null}
              </PropertyRow>

              <PropertyRow
                icon={<Tag size={14} />}
                label="Etiquetas"
                onClick={() => setPainelAberto(painelAberto === "etiquetas" ? null : "etiquetas")}
                active={painelAberto === "etiquetas"}
              >
                {etiquetasDoCartao.length > 0 ? (
                  <div className="flex gap-1">
                    {etiquetasDoCartao.slice(0, 4).map((e) => (
                      <div key={e.id} className="w-3.5 h-3.5 rounded-full" style={{ background: e.cor }} title={e.nome} />
                    ))}
                  </div>
                ) : null}
              </PropertyRow>

              <PropertyRow
                icon={<Zap size={14} />}
                label="Story Points"
                onClick={() => setPainelAberto(painelAberto === "peso" ? null : "peso")}
                active={painelAberto === "peso"}
              >
                {pesoLocal ? (
                  <span
                    className="text-[12px] font-bold w-7 h-7 rounded-[8px] flex items-center justify-center"
                    style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}
                  >
                    {pesoLocal}
                  </span>
                ) : null}
              </PropertyRow>

              <PropertyRow
                icon={<CheckSquare size={14} />}
                label="Checklist"
                onClick={() => criarChecklist()}
              >
                {totalItens > 0 ? (
                  <span className="text-[11px] font-bold" style={{ color: percentual === 100 ? "var(--tf-success)" : "var(--tf-text-tertiary)" }}>
                    {totalConcluidos}/{totalItens}
                  </span>
                ) : (
                  <span className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>+ Criar</span>
                )}
              </PropertyRow>

              {/* Activity summary */}
              {(anexos.length > 0 || comentarios.length > 0) && (
                <div className="pt-4 mt-4 border-t space-y-2" style={{ borderColor: "var(--tf-border)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--tf-text-tertiary)" }}>Atividade</p>
                  {anexos.length > 0 && (
                    <div className="flex items-center gap-2 py-1">
                      <Paperclip size={12} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[11px]" style={{ color: "var(--tf-text-secondary)" }}>
                        {anexos.length} {anexos.length === 1 ? "anexo" : "anexos"}
                      </span>
                    </div>
                  )}
                  {comentarios.length > 0 && (
                    <div className="flex items-center gap-2 py-1">
                      <Users size={12} style={{ color: "var(--tf-text-tertiary)" }} />
                      <span className="text-[11px]" style={{ color: "var(--tf-text-secondary)" }}>
                        {comentarios.length} {comentarios.length === 1 ? "comentário" : "comentários"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Danger */}
              <div className="pt-4 mt-4 border-t" style={{ borderColor: "var(--tf-border)" }}>
                <button
                  onClick={() => { onExcluir(cartao.id); onFechar(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium rounded-[8px] hover:bg-[var(--tf-danger-bg)]"
                  style={{ color: "var(--tf-danger)", transition: "background 0.15s ease" }}
                >
                  <Trash2 size={13} />
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

// ── Property Row ──
function PropertyRow({
  icon, label, onClick, active, children,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-2.5 px-2 rounded-[8px] group hover:bg-[var(--tf-surface-hover)]"
      style={{ transition: "background 0.15s ease" }}
    >
      <div className="flex items-center gap-2.5">
        <span style={{ color: active ? "var(--tf-accent)" : "var(--tf-text-tertiary)" }}>{icon}</span>
        <span className="text-[13px] font-medium" style={{ color: active ? "var(--tf-accent-text)" : "var(--tf-text-secondary)" }}>{label}</span>
      </div>
      <div className="flex items-center">
        {children || <span className="text-[11px] opacity-0 group-hover:opacity-100" style={{ color: "var(--tf-text-tertiary)", transition: "opacity 0.15s ease" }}>Definir</span>}
      </div>
    </button>
  );
}

// ── PR Actions Panel ──
function PainelPR({
  cartao,
}: {
  cartao: CartaoComResumo;
  onRefresh: () => void;
}) {
  const statusCor =
    cartao.pr_status === "open"
      ? "var(--tf-success)"
      : cartao.pr_status === "merged"
        ? "#8b5cf6"
        : "var(--tf-danger)";

  const statusLabel =
    cartao.pr_status === "open"
      ? "Aberto"
      : cartao.pr_status === "merged"
        ? "Merged"
        : "Fechado";

  const historico = Array.isArray(cartao.pr_historico) ? cartao.pr_historico : [];

  function formatarDataPR(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div>
      {cartao.pr_numero && (
        <div className="p-4 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
          <div className="flex items-center gap-2 mb-1">
            <GitPullRequest size={15} style={{ color: statusCor }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
              PR #{cartao.pr_numero}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: `color-mix(in srgb, ${statusCor} 15%, transparent)`, color: statusCor }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCor }} />
              {statusLabel}
            </span>
            {cartao.pr_url && (
              <a
                href={cartao.pr_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto p-1 rounded-[4px] hover:bg-[var(--tf-surface-hover)]"
                style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
          {cartao.pr_autor && (
            <p className="text-[11px] ml-[23px]" style={{ color: "var(--tf-text-tertiary)" }}>
              por <strong style={{ color: "var(--tf-text-secondary)" }}>{cartao.pr_autor}</strong>
            </p>
          )}
        </div>
      )}

      {historico.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--tf-text-tertiary)" }}>
            Histórico
          </p>
          <div className="space-y-1.5">
            {historico.map((h, i) => {
              const cor = h.status === "merged" ? "#8b5cf6" : "var(--tf-danger)";
              const iconeLabel = h.status === "merged" ? "✓ Merged" : "✗ Rejeitado";
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-[11px]" style={{ background: "var(--tf-bg-secondary)" }}>
                  <span className="font-bold" style={{ color: cor }}>{iconeLabel}</span>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    PR #{h.numero}
                  </a>
                  <span style={{ color: "var(--tf-text-tertiary)" }}>por {h.autor}</span>
                  <span className="ml-auto" style={{ color: "var(--tf-text-tertiary)" }}>{formatarDataPR(h.data)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!cartao.pr_numero && historico.length === 0 && (
        <p className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Nenhum PR vinculado</p>
      )}
    </div>
  );
}
