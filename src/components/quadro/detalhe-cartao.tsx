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
  GitBranch,
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
import { useEffect, useMemo, useRef, useState } from "react";
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

type Painel = "etiquetas" | "membros" | "data" | "peso" | "pr" | "branch" | null;

export function DetalheCartao({
  cartao, etiquetas, membros, quadroId, onFechar, onAtualizar, onExcluir,
  onCriarEtiqueta, onExcluirEtiqueta, onCriarMembro, onRefresh,
}: DetalheCartaoProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [editandoDescricao, setEditandoDescricao] = useState(false);
  const [painelAberto, setPainelAberto] = useState<Painel>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  // Scroll suave até o painel quando abrir
  useEffect(() => {
    if (painelAberto && painelRef.current) {
      setTimeout(() => {
        painelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }, [painelAberto]);

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

  const etiquetasDoCartao = useMemo(() => etiquetas.filter((e) => etiquetaIds.includes(e.id)), [etiquetas, etiquetaIds]);
  const membrosDoCartao = useMemo(() => membros.filter((m) => membroIds.includes(m.id)), [membros, membroIds]);
  const dataStatus = statusData(dataLocal);

  const { totalItens, totalConcluidos, percentual } = useMemo(() => {
    const itens = checklists.reduce((sum, cl) => sum + cl.checklist_itens.length, 0);
    const concluidos = checklists.reduce((sum, cl) => sum + cl.checklist_itens.filter((i) => i.concluido).length, 0);
    return { totalItens: itens, totalConcluidos: concluidos, percentual: itens > 0 ? Math.round((concluidos / itens) * 100) : 0 };
  }, [checklists]);

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
              <div ref={painelRef} />
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

              {painelAberto === "branch" && (
                <PainelBranch
                  cartao={cartao}
                  onAtualizar={(campos) => onAtualizar(cartao.id, campos)}
                />
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
              {(cartao.pr_numero || painelAberto === "pr" || (Array.isArray(cartao.pr_historico) && cartao.pr_historico.length > 0)) && (
                <PainelPR
                  cartao={cartao}
                  onRefresh={onRefresh}
                  onAtualizar={async (campos) => { await onAtualizar(cartao.id, campos); onRefresh(); }}
                  painelAberto={painelAberto === "pr"}
                />
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

              {cartao.workspace_id && (
                <PropertyRow
                  icon={<GitPullRequest size={14} />}
                  label="Pull Request"
                  onClick={() => setPainelAberto(painelAberto === "pr" ? null : "pr")}
                  active={painelAberto === "pr"}
                >
                  {cartao.pr_numero ? (
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: cartao.pr_status === "open" ? "var(--tf-success-bg)" : cartao.pr_status === "merged" ? "#8b5cf622" : "var(--tf-danger-bg)",
                        color: cartao.pr_status === "open" ? "var(--tf-success)" : cartao.pr_status === "merged" ? "#8b5cf6" : "var(--tf-danger)",
                      }}
                    >
                      #{cartao.pr_numero}
                    </span>
                  ) : null}
                </PropertyRow>
              )}

              <PropertyRow
                icon={<GitBranch size={14} />}
                label="Branch"
                onClick={() => setPainelAberto(painelAberto === "branch" ? null : "branch")}
                active={painelAberto === "branch"}
              >
                {cartao.branch ? (
                  <span className="text-[11px] font-mono font-medium truncate max-w-[100px]" style={{ color: "var(--tf-text-secondary)" }}>
                    {cartao.branch}
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
  onAtualizar,
  painelAberto,
}: {
  cartao: CartaoComResumo;
  onRefresh: () => void;
  onAtualizar: (campos: Record<string, unknown>) => void;
  painelAberto: boolean;
}) {
  const [prInfo, setPrInfo] = useState<{ title: string; repoFullName: string } | null>(null);
  const [carregandoInfo, setCarregandoInfo] = useState(false);
  const [confirmDesvincular, setConfirmDesvincular] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [prsDisponiveis, setPrsDisponiveis] = useState<{ number: number; title: string; html_url: string; user: { login: string }; head?: { ref: string } }[]>([]);
  const [carregandoPrs, setCarregandoPrs] = useState(false);
  const [repoInfo, setRepoInfo] = useState<{ id: string; owner: string; nome: string } | null>(null);
  const [buscaPR, setBuscaPR] = useState("");

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

  // Fetch PR title and repo name
  useEffect(() => {
    if (!cartao.pr_numero || !cartao.pr_repo_id) return;
    setCarregandoInfo(true);

    (async () => {
      try {
        // Get repo info from Supabase
        const { supabase } = await import("@/lib/supabase/client");
        const { data: repo } = await supabase
          .from("repositorios")
          .select("owner, nome")
          .eq("id", cartao.pr_repo_id)
          .single();

        if (!repo) { setCarregandoInfo(false); return; }

        const repoFullName = `${repo.owner}/${repo.nome}`;

        // Fetch PR title from GitHub
        const res = await fetch("/api/pr-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: repo.owner, repo: repo.nome, prNumber: cartao.pr_numero }),
        });
        const data = await res.json();
        setPrInfo({ title: data.title || `PR #${cartao.pr_numero}`, repoFullName });
      } catch {
        setPrInfo(null);
      } finally {
        setCarregandoInfo(false);
      }
    })();
  }, [cartao.pr_numero, cartao.pr_repo_id]);

  // Load repos for linking when panel opens
  useEffect(() => {
    if (!vinculando || !cartao.workspace_id) return;
    (async () => {
      const { supabase } = await import("@/lib/supabase/client");
      const { data: repos } = await supabase
        .from("repositorios")
        .select("id, owner, nome")
        .eq("workspace_id", cartao.workspace_id);

      if (repos && repos.length > 0) {
        const repo = repos[0]; // auto-select first repo
        setRepoInfo(repo);
        setCarregandoPrs(true);
        try {
          const res = await fetch("/api/prs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ owner: repo.owner, repo: repo.nome, state: "open" }),
          });
          const data = await res.json();
          setPrsDisponiveis(data.prs || []);
        } catch { setPrsDisponiveis([]); }
        finally { setCarregandoPrs(false); }
      }
    })();
  }, [vinculando, cartao.workspace_id]);

  function handleDesvincular() {
    const entry = cartao.pr_numero ? {
      numero: cartao.pr_numero,
      url: cartao.pr_url || "",
      status: cartao.pr_status || "closed",
      autor: cartao.pr_autor || "unknown",
      data: new Date().toISOString(),
    } : null;

    const novoHistorico = entry ? [...historico, entry] : historico;

    onAtualizar({
      pr_numero: null,
      pr_url: null,
      pr_status: null,
      pr_repo_id: null,
      pr_autor: null,
      pr_historico: novoHistorico,
    });
    setConfirmDesvincular(false);
    setPrInfo(null);
  }

  function handleVincular(pr: { number: number; title: string; html_url: string; user: { login: string }; head?: { ref: string } }) {
    if (!repoInfo) return;
    const campos: Record<string, unknown> = {
      pr_numero: pr.number,
      pr_url: pr.html_url,
      pr_status: "open",
      pr_repo_id: repoInfo.id,
      pr_autor: pr.user.login,
    };
    // Auto-link branch from PR
    if (pr.head?.ref) {
      campos.branch = pr.head.ref;
      campos.branch_repo_id = repoInfo.id;
    }
    onAtualizar(campos);
    setVinculando(false);
    setBuscaPR("");
  }

  function formatarDataPR(d: string) {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const prsFiltrados = prsDisponiveis.filter((pr) =>
    !buscaPR || pr.title.toLowerCase().includes(buscaPR.toLowerCase()) || `#${pr.number}`.includes(buscaPR)
  );

  return (
    <div>
      {/* PR vinculado */}
      {cartao.pr_numero && (
        <div className="p-4 rounded-[14px]" style={{ background: "var(--tf-bg-secondary)" }}>
          <div className="flex items-center gap-2 mb-1">
            <GitPullRequest size={15} style={{ color: statusCor }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
              PR #{cartao.pr_numero}
              {prInfo && !carregandoInfo && prInfo.title && !prInfo.title.startsWith(`PR #${cartao.pr_numero}`) && (
                <span className="font-normal ml-1" style={{ color: "var(--tf-text-secondary)" }}>
                  {prInfo.title}
                </span>
              )}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
              style={{ background: `color-mix(in srgb, ${statusCor} 15%, transparent)`, color: statusCor }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCor }} />
              {statusLabel}
            </span>
            <div className="ml-auto flex items-center gap-1 shrink-0">
              {cartao.pr_url && (
                <a
                  href={cartao.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-[4px] hover:bg-[var(--tf-surface-hover)]"
                  style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
                  title="Abrir no GitHub"
                >
                  <ExternalLink size={13} />
                </a>
              )}
              {!confirmDesvincular ? (
                <button
                  onClick={() => setConfirmDesvincular(true)}
                  className="p-1 rounded-[4px] hover:bg-[var(--tf-danger-bg)]"
                  style={{ color: "var(--tf-text-tertiary)", transition: "all 0.15s ease" }}
                  title="Desvincular PR"
                >
                  <X size={13} />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDesvincular}
                    className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold"
                    style={{ background: "var(--tf-danger)", color: "#fff" }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmDesvincular(false)}
                    className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold"
                    style={{ color: "var(--tf-text-tertiary)", background: "var(--tf-surface-hover)" }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Repo name + author */}
          <div className="ml-[23px] space-y-0.5">
            {prInfo && !carregandoInfo && (
              <p className="text-[11px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>
                {prInfo.repoFullName}
              </p>
            )}
            {cartao.pr_autor && (
              <p className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                por <strong style={{ color: "var(--tf-text-secondary)" }}>{cartao.pr_autor}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Vincular PR existente (quando não tem PR e painel está aberto) */}
      {!cartao.pr_numero && painelAberto && (
        <div>
          {!vinculando ? (
            <button
              onClick={() => setVinculando(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[14px] text-[13px] font-medium border-2 border-dashed hover:border-solid"
              style={{ borderColor: "var(--tf-border)", color: "var(--tf-text-secondary)", transition: "all 0.15s ease" }}
            >
              <GitPullRequest size={15} />
              Vincular PR existente
            </button>
          ) : (
            <div className="rounded-[14px] overflow-hidden" style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)" }}>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
                    PRs Abertas {repoInfo && `— ${repoInfo.owner}/${repoInfo.nome}`}
                  </p>
                  <button onClick={() => { setVinculando(false); setBuscaPR(""); }} className="p-1 rounded-[4px]" style={{ color: "var(--tf-text-tertiary)" }}>
                    <X size={12} />
                  </button>
                </div>
                <input
                  value={buscaPR}
                  onChange={(e) => setBuscaPR(e.target.value)}
                  placeholder="Buscar por título ou número..."
                  className="w-full px-3 py-2 text-[12px] rounded-[8px] outline-none"
                  style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
                  autoFocus
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                {carregandoPrs ? (
                  <div className="flex items-center justify-center py-6 gap-2" style={{ color: "var(--tf-text-tertiary)" }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[11px]">Carregando PRs...</span>
                  </div>
                ) : prsFiltrados.length === 0 ? (
                  <p className="text-center py-6 text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
                    {buscaPR ? "Nenhuma PR encontrada" : "Sem PRs abertas"}
                  </p>
                ) : (
                  prsFiltrados.map((pr) => (
                    <button
                      key={pr.number}
                      onClick={() => handleVincular(pr)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--tf-surface-hover)]"
                      style={{ transition: "background 0.1s ease", borderTop: "1px solid var(--tf-border-subtle)" }}
                    >
                      <GitPullRequest size={13} style={{ color: "var(--tf-success)" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono" style={{ color: "var(--tf-text-tertiary)" }}>#{pr.number}</span>
                          <span className="text-[12px] font-medium truncate" style={{ color: "var(--tf-text)" }}>{pr.title}</span>
                        </div>
                        <span className="text-[10px]" style={{ color: "var(--tf-text-tertiary)" }}>{pr.user.login}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
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
    </div>
  );
}

// ── Branch Panel ──
function PainelBranch({
  cartao,
  onAtualizar,
}: {
  cartao: CartaoComResumo;
  onAtualizar: (campos: Record<string, unknown>) => void;
}) {
  const [repos, setRepos] = useState<{ id: string; owner: string; nome: string }[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [repoSelecionado, setRepoSelecionado] = useState<string | null>(cartao.branch_repo_id || null);
  const [modo, setModo] = useState<"selecionar" | "manual">(cartao.branch ? "manual" : "selecionar");
  const [inputManual, setInputManual] = useState(cartao.branch || "");

  // Load repos
  useEffect(() => {
    if (!cartao.workspace_id) return;
    (async () => {
      const { supabase } = await import("@/lib/supabase/client");
      const { data } = await supabase
        .from("repositorios")
        .select("id, owner, nome")
        .eq("workspace_id", cartao.workspace_id);
      if (data && data.length > 0) {
        setRepos(data);
        if (!repoSelecionado && data.length === 1) {
          setRepoSelecionado(data[0].id);
        }
      }
    })();
  }, [cartao.workspace_id, repoSelecionado]);

  // Load branches when repo selected
  useEffect(() => {
    if (!repoSelecionado || modo === "manual") return;
    const repo = repos.find(r => r.id === repoSelecionado);
    if (!repo) return;

    setCarregando(true);
    fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: repo.owner, repo: repo.nome }),
    })
      .then(r => r.json())
      .then(data => setBranches((data.branches || []).map((b: { name: string }) => b.name)))
      .catch(() => setBranches([]))
      .finally(() => setCarregando(false));
  }, [repoSelecionado, repos, modo]);

  const repoAtual = repos.find(r => r.id === repoSelecionado);
  const branchesFiltradas = branches.filter(b =>
    !busca || b.toLowerCase().includes(busca.toLowerCase())
  );

  function handleSelecionarBranch(branchName: string) {
    onAtualizar({ branch: branchName, branch_repo_id: repoSelecionado });
    setModo("manual");
    setInputManual(branchName);
  }

  function handleSalvarManual() {
    const val = inputManual.trim() || null;
    onAtualizar({ branch: val, branch_repo_id: val ? repoSelecionado : null });
  }

  function handleLimpar() {
    onAtualizar({ branch: null, branch_repo_id: null });
    setInputManual("");
    setModo("selecionar");
  }

  // Se já tem branch, mostrar info + opção de limpar
  if (cartao.branch && modo === "manual") {
    const repoNome = repoAtual ? `${repoAtual.owner}/${repoAtual.nome}` : repos.find(r => r.id === cartao.branch_repo_id) ? `${repos.find(r => r.id === cartao.branch_repo_id)!.owner}/${repos.find(r => r.id === cartao.branch_repo_id)!.nome}` : null;

    return (
      <div className="p-4 rounded-[14px] space-y-3" style={{ background: "var(--tf-bg-secondary)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
          Branch
        </p>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-[8px]" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}>
          <GitBranch size={14} style={{ color: "var(--tf-accent)" }} />
          <span className="text-[13px] font-mono font-medium" style={{ color: "var(--tf-text)" }}>
            {cartao.branch}
          </span>
        </div>
        {repoNome && (
          <p className="text-[11px] font-medium ml-1" style={{ color: "var(--tf-text-tertiary)" }}>
            {repoNome}
          </p>
        )}
        <div className="flex items-center gap-2">
          {repoAtual && cartao.branch && (
            <a
              href={`https://github.com/${repoAtual.owner}/${repoAtual.nome}/tree/${cartao.branch}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium hover:underline flex items-center gap-1"
              style={{ color: "var(--tf-accent)" }}
            >
              <ExternalLink size={10} />
              Ver no GitHub
            </a>
          )}
          <button
            onClick={() => { setModo("selecionar"); }}
            className="text-[11px] font-medium hover:underline"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Trocar
          </button>
          <button
            onClick={handleLimpar}
            className="text-[11px] font-medium hover:underline"
            style={{ color: "var(--tf-danger)" }}
          >
            Limpar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] overflow-hidden" style={{ background: "var(--tf-bg-secondary)", border: "1px solid var(--tf-border)" }}>
      <div className="p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
          Associar Branch
        </p>

        {/* Repo selector */}
        {repos.length > 1 && (
          <select
            value={repoSelecionado || ""}
            onChange={(e) => { setRepoSelecionado(e.target.value); setBranches([]); setBusca(""); }}
            className="w-full px-3 py-2 text-[12px] rounded-[8px] outline-none"
            style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
          >
            <option value="">Selecionar repositório...</option>
            {repos.map(r => (
              <option key={r.id} value={r.id}>{r.owner}/{r.nome}</option>
            ))}
          </select>
        )}

        {repos.length === 1 && (
          <p className="text-[11px] font-medium" style={{ color: "var(--tf-text-tertiary)" }}>
            {repos[0].owner}/{repos[0].nome}
          </p>
        )}

        {/* Branch search */}
        {repoSelecionado && (
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar branch..."
            className="w-full px-3 py-2 text-[12px] rounded-[8px] outline-none"
            style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
            autoFocus
          />
        )}

        {/* Manual input toggle */}
        <button
          onClick={() => setModo(modo === "manual" ? "selecionar" : "manual")}
          className="text-[11px] font-medium hover:underline"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          {modo === "manual" ? "Escolher da lista" : "Digitar manualmente"}
        </button>
      </div>

      {modo === "manual" ? (
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch size={13} style={{ color: "var(--tf-text-tertiary)" }} />
            <input
              value={inputManual}
              onChange={(e) => setInputManual(e.target.value)}
              onBlur={handleSalvarManual}
              onKeyDown={(e) => { if (e.key === "Enter") handleSalvarManual(); }}
              placeholder="feature/minha-branch"
              className="flex-1 px-3 py-2 text-[13px] font-mono rounded-[8px] outline-none"
              style={{ background: "var(--tf-surface)", border: "2px solid var(--tf-accent)", color: "var(--tf-text)" }}
              autoFocus
            />
          </div>
        </div>
      ) : repoSelecionado ? (
        <div className="max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {carregando ? (
            <div className="flex items-center justify-center py-6 gap-2" style={{ color: "var(--tf-text-tertiary)" }}>
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[11px]">Carregando branches...</span>
            </div>
          ) : branchesFiltradas.length === 0 ? (
            <p className="text-center py-6 text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
              {busca ? "Nenhuma branch encontrada" : "Sem branches"}
            </p>
          ) : (
            branchesFiltradas.map((b) => (
              <button
                key={b}
                onClick={() => handleSelecionarBranch(b)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--tf-surface-hover)]"
                style={{ transition: "background 0.1s ease", borderTop: "1px solid var(--tf-border-subtle)" }}
              >
                <GitBranch size={12} style={{ color: "var(--tf-text-tertiary)" }} />
                <span className="text-[12px] font-mono font-medium" style={{ color: "var(--tf-text)" }}>{b}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
