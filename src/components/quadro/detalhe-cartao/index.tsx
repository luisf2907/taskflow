"use client";

import { supabase } from "@/lib/supabase/client";
import { useAnexos } from "@/hooks/use-anexos";
import { useCartaoEtiquetas } from "@/hooks/use-cartao-etiquetas";
import { useCartaoMembros } from "@/hooks/use-cartao-membros";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { useChecklists } from "@/hooks/use-checklists";
import { useComentarios } from "@/hooks/use-comentarios";
import { Etiqueta, Membro } from "@/types";
import { getContrastTextColor } from "@/lib/colors";
import { mutate as globalMutate } from "swr";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  GitBranch,
  GitPullRequest,
  Loader2,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
  Paperclip,
  X,
  Zap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { Anexos } from "../anexos";
import { Avatar } from "../avatar";
import { ChecklistComponent } from "../checklist";
import { Comentarios } from "../comentarios";
import { SeletorData, formatarData, statusData } from "../seletor-data";
import { SeletorEtiquetas } from "../seletor-etiquetas";
import { SeletorMembros } from "../seletor-membros";
import { SeletorPeso } from "../seletor-peso";

import { PropertyRow } from "./property-row";
import { PainelPR } from "./painel-pr";
import { PainelBranch } from "./painel-branch";

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
  const [confirmExcluirCard, setConfirmExcluirCard] = useState(false);
  const [melhorandoIA, setMelhorandoIA] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store previously focused element on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    return () => { previousFocusRef.current?.focus(); };
  }, []);  
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

  const { checklists, criarChecklist, excluirChecklist, criarItem, toggleItem, excluirItem, buscar: buscarChecklists } = useChecklists(cartao?.id || null);
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

  async function melhorarComIA() {
    if (!cartao || melhorandoIA) return;
    setMelhorandoIA(true);
    try {
      const checklistItens = checklists.flatMap((cl) => cl.checklist_itens.map((i) => i.texto));
      const res = await fetch("/api/ai/enhance-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo,
          descricao: descricao,
          checklistItens,
          etiquetaIdsAtuais: etiquetaIds,
          etiquetasDisponiveis: etiquetas.map((e) => ({ id: e.id, nome: e.nome })),
          peso: pesoLocal,
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao melhorar card"); return; }

      // Atualizar descricao
      if (data.descricao) {
        setDescricao(data.descricao);
        onAtualizar(cartao.id, { descricao: data.descricao });
      }

      // Adicionar novos itens de checklist (bulk insert)
      if (data.checklist_novos && data.checklist_novos.length > 0) {
        // Buscar checklist existente direto do banco para evitar estado stale
        const { data: checklistsDB } = await supabase
          .from("checklists")
          .select("id, checklist_itens(id)")
          .eq("cartao_id", cartao.id)
          .order("posicao")
          .limit(1);

        let checklistId: string;
        if (checklistsDB && checklistsDB.length > 0) {
          checklistId = checklistsDB[0].id;
          const basePos = Array.isArray(checklistsDB[0].checklist_itens) ? checklistsDB[0].checklist_itens.length : 0;
          const itens = data.checklist_novos.map((texto: string, idx: number) => ({
            checklist_id: checklistId,
            texto,
            posicao: basePos + idx,
            concluido: false,
          }));
          await supabase.from("checklist_itens").insert(itens);
        } else {
          // Criar checklist + itens
          const { data: novaChecklist } = await supabase
            .from("checklists")
            .insert({ cartao_id: cartao.id, titulo: "Criterios de aceitacao", posicao: 0 })
            .select()
            .single();
          if (novaChecklist) {
            const itens = data.checklist_novos.map((texto: string, idx: number) => ({
              checklist_id: novaChecklist.id,
              texto,
              posicao: idx,
              concluido: false,
            }));
            await supabase.from("checklist_itens").insert(itens);
          }
        }
        buscarChecklists();
      }

      // Atualizar etiquetas (adicionar novas, nao remover existentes)
      if (data.etiqueta_ids && data.etiqueta_ids.length > 0) {
        for (const id of data.etiqueta_ids) {
          if (!etiquetaIds.includes(id)) {
            await toggleEtiqueta(id);
          }
        }
      }

      // Sugerir peso se nao tem
      if (data.peso_sugerido && !pesoLocal) {
        handleMudarPeso(data.peso_sugerido);
      }

      toast.success("Card melhorado com IA!");
      onRefresh();
    } catch {
      toast.error("Erro de conexao com IA.");
    } finally {
      setMelhorandoIA(false);
    }
  }

  const etiquetasDoCartao = useMemo(() => etiquetas.filter((e) => etiquetaIds.includes(e.id)), [etiquetas, etiquetaIds]);
  const membrosDoCartao = useMemo(() => membros.filter((m) => membroIds.includes(m.id)), [membros, membroIds]);
  const dataStatus = statusData(dataLocal);

  const { totalItens, totalConcluidos, percentual } = useMemo(() => {
    const itens = checklists.reduce((sum, cl) => sum + cl.checklist_itens.length, 0);
    const concluidos = checklists.reduce((sum, cl) => sum + cl.checklist_itens.filter((i) => i.concluido).length, 0);
    return { totalItens: itens, totalConcluidos: concluidos, percentual: itens > 0 ? Math.round((concluidos / itens) * 100) : 0 };
  }, [checklists]);

  if (!cartao) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={handleFechar} />

      <div
        className="relative rounded-[20px] w-full max-w-4xl my-8 mx-2 sm:mx-4 z-10 overflow-hidden"
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
            aria-label="Fechar detalhes do cartão"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:min-h-[480px]">
          {/* ═══ LEFT — Main Content ═══ */}
          <div className="flex-1 overflow-y-auto max-h-[75vh]">
            <div className="px-4 sm:px-8 pb-8 pt-2 space-y-6">

              {/* TITLE */}
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={salvar}
                maxLength={200}
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
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: e.cor, color: getContrastTextColor(e.cor) }}
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
                      maxLength={5000}
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
            className="w-full md:w-[260px] shrink-0 border-t md:border-t-0 md:border-l overflow-y-auto max-h-[50vh] md:max-h-[75vh]"
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
                        background: cartao.pr_status === "open" ? "var(--tf-success-bg)" : cartao.pr_status === "merged" ? "var(--tf-merged-bg)" : "var(--tf-danger-bg)",
                        color: cartao.pr_status === "open" ? "var(--tf-success)" : cartao.pr_status === "merged" ? "var(--tf-merged)" : "var(--tf-danger)",
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

              {/* Melhorar com IA */}
              <button
                onClick={melhorarComIA}
                disabled={melhorandoIA}
                className="w-full flex items-center justify-between py-2.5 px-2 rounded-[8px] group hover:bg-[var(--tf-surface-hover)] disabled:opacity-50"
                style={{ transition: "background 0.15s ease" }}
              >
                <div className="flex items-center gap-2.5">
                  <span style={{ color: "var(--tf-accent)" }}>
                    {melhorandoIA ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  </span>
                  <span className="text-[13px] font-medium" style={{ color: "var(--tf-accent-text)" }}>
                    {melhorandoIA ? "Melhorando..." : "Melhorar com IA"}
                  </span>
                </div>
              </button>

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
                {!confirmExcluirCard ? (
                  <button
                    onClick={() => setConfirmExcluirCard(true)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-[12px] font-medium rounded-[8px] hover:bg-[var(--tf-danger-bg)]"
                    style={{ color: "var(--tf-danger)", transition: "background 0.15s ease" }}
                  >
                    <Trash2 size={13} />
                    Excluir cartão
                  </button>
                ) : (
                  <div className="p-3 rounded-[10px]" style={{ background: "var(--tf-danger-bg)" }}>
                    <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--tf-danger)" }}>
                      Tem certeza? Checklists, anexos e comentários serão perdidos.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onExcluir(cartao.id); onFechar(); }}
                        className="px-3 py-1.5 text-[11px] font-bold text-white rounded-[8px]"
                        style={{ background: "var(--tf-danger)" }}
                      >
                        Sim, excluir
                      </button>
                      <button
                        onClick={() => setConfirmExcluirCard(false)}
                        className="px-3 py-1.5 text-[11px] font-medium rounded-[8px]"
                        style={{ color: "var(--tf-text-secondary)", background: "var(--tf-bg-secondary)" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
