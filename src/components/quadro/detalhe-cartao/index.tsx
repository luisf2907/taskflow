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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0"
        onClick={handleFechar}
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      <div className="relative min-h-full flex items-center justify-center p-4">
        <div
          className="relative rounded-[var(--tf-radius-xl)] w-full max-w-4xl z-10 overflow-hidden"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            boxShadow: "var(--tf-shadow-lg)",
          }}
        >
        {/* ─── TOP BAR ─── */}
        <div
          className="flex items-center justify-between px-5 h-10"
          style={{ borderBottom: "1px solid var(--tf-border)" }}
        >
          <div className="flex items-center gap-1.5">
            {etiquetasDoCartao.length > 0 && (
              <div className="flex gap-1 mr-1">
                {etiquetasDoCartao.slice(0, 5).map((e) => (
                  <span
                    key={e.id}
                    className="w-2 h-2"
                    style={{
                      backgroundColor: e.cor,
                      borderRadius: "1px",
                    }}
                    title={e.nome}
                  />
                ))}
              </div>
            )}
            <span
              className="label-mono"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Cartão
            </span>
            {pesoLocal && (
              <span
                className="inline-flex items-center px-1.5 h-[17px] text-[0.625rem] font-medium"
                style={{
                  background: "var(--tf-accent-light)",
                  color: "var(--tf-accent-text)",
                  border: "1px solid var(--tf-accent)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                {pesoLocal} PTS
              </span>
            )}
            {dataLocal && (
              <span
                className="inline-flex items-center px-1.5 h-[17px] text-[0.625rem] font-medium"
                style={{
                  color:
                    dataStatus === "vencido"
                      ? "#FFFFFF"
                      : dataStatus === "proximo"
                        ? "var(--tf-warning)"
                        : "var(--tf-text-tertiary)",
                  background:
                    dataStatus === "vencido"
                      ? "var(--tf-danger)"
                      : dataStatus === "proximo"
                        ? "var(--tf-warning-bg)"
                        : "transparent",
                  border: `1px solid ${
                    dataStatus === "vencido"
                      ? "var(--tf-danger)"
                      : dataStatus === "proximo"
                        ? "var(--tf-warning)"
                        : "var(--tf-border)"
                  }`,
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                {formatarData(dataLocal)}
              </span>
            )}
          </div>
          <button
            onClick={handleFechar}
            className="p-1 transition-colors hover:bg-[var(--tf-surface-hover)]"
            style={{
              color: "var(--tf-text-tertiary)",
              borderRadius: "var(--tf-radius-xs)",
            }}
            aria-label="Fechar detalhes do cartão"
          >
            <X size={15} strokeWidth={1.75} />
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
                className="w-full text-[1.375rem] font-semibold bg-transparent outline-none px-1.5 py-1 -mx-1.5"
                style={{
                  color: "var(--tf-text)",
                  border: "1px solid transparent",
                  borderRadius: "var(--tf-radius-xs)",
                  letterSpacing: "-0.02em",
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--tf-accent)";
                  e.currentTarget.style.background = "var(--tf-bg-secondary)";
                }}
                onBlurCapture={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.background = "transparent";
                }}
                placeholder="Título do cartão"
              />

              {/* LABELS ROW */}
              <div className="flex flex-wrap gap-1 items-center">
                {etiquetasDoCartao.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center px-2 h-[20px] text-[0.6875rem] font-medium leading-none"
                    style={{
                      backgroundColor: e.cor,
                      color: getContrastTextColor(e.cor),
                      borderRadius: "var(--tf-radius-xs)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {e.nome}
                  </span>
                ))}
                <button
                  onClick={() =>
                    setPainelAberto(painelAberto === "etiquetas" ? null : "etiquetas")
                  }
                  className="inline-flex items-center px-2 h-[20px] text-[0.6875rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    border: "1px dashed var(--tf-border-strong)",
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.04em",
                  }}
                >
                  + etiqueta
                </button>
              </div>

              {/* INLINE PANELS */}
              <div ref={painelRef} />
              {painelAberto === "etiquetas" && (
                <div
                  className="p-3.5"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-md)",
                  }}
                >
                  <SeletorEtiquetas etiquetas={etiquetas} selecionadas={etiquetaIds} onToggle={toggleEtiqueta} onCriar={onCriarEtiqueta} onExcluir={onExcluirEtiqueta} />
                </div>
              )}

              {painelAberto === "membros" && (
                <div
                  className="p-3.5"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-md)",
                  }}
                >
                  <SeletorMembros membros={membros} selecionados={membroIds} onToggle={toggleMembro} onCriar={onCriarMembro} />
                </div>
              )}

              {painelAberto === "data" && (
                <div
                  className="p-3.5"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-md)",
                  }}
                >
                  <SeletorData valor={dataLocal} onChange={handleMudarData} />
                </div>
              )}

              {painelAberto === "peso" && (
                <div
                  className="p-3.5"
                  style={{
                    background: "var(--tf-bg-secondary)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-md)",
                  }}
                >
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
                  <AlignLeft size={13} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
                  <h3
                    className="label-mono"
                    style={{ color: "var(--tf-text-secondary)" }}
                  >
                    Descrição
                  </h3>
                  {!editandoDescricao && descricao && (
                    <button
                      onClick={() => setEditandoDescricao(true)}
                      className="ml-auto h-6 px-2 text-[0.6875rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
                      style={{
                        color: "var(--tf-text-tertiary)",
                        borderRadius: "var(--tf-radius-xs)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
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
                      className="descricao-textarea w-full px-3.5 py-3 text-[0.8125rem] resize-none outline-none min-h-[100px] leading-relaxed"
                      style={{
                        color: "var(--tf-text)",
                        borderRadius: "var(--tf-radius-md)",
                        letterSpacing: "-0.005em",
                      }}
                      autoFocus={editandoDescricao}
                      onFocus={() => {
                        if (!editandoDescricao) setEditandoDescricao(true);
                      }}
                    />
                    <style jsx>{`
                      .descricao-textarea {
                        background: var(--tf-bg-secondary);
                        border: 1px solid var(--tf-border);
                        transition: border-color 0.15s ease, background 0.15s ease;
                      }
                      .descricao-textarea:focus {
                        background: var(--tf-surface);
                        border-color: var(--tf-accent);
                      }
                    `}</style>
                    {editandoDescricao && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            salvar();
                            setEditandoDescricao(false);
                          }}
                          className="h-8 px-3 text-[0.75rem] font-medium text-white transition-colors hover:brightness-110"
                          style={{
                            background: "var(--tf-accent)",
                            border: "1px solid var(--tf-accent)",
                            borderRadius: "var(--tf-radius-xs)",
                          }}
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => {
                            setDescricao(cartao.descricao || "");
                            setEditandoDescricao(false);
                          }}
                          className="h-8 px-3 text-[0.75rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)]"
                          style={{
                            color: "var(--tf-text-secondary)",
                            border: "1px solid var(--tf-border)",
                            borderRadius: "var(--tf-radius-xs)",
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="text-[0.8125rem] px-3.5 py-3 cursor-pointer whitespace-pre-wrap leading-relaxed transition-colors"
                    style={{
                      background: "var(--tf-bg-secondary)",
                      color: "var(--tf-text)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-md)",
                      letterSpacing: "-0.005em",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--tf-border-strong)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--tf-border)")
                    }
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare size={13} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
                      <h3
                        className="label-mono"
                        style={{ color: "var(--tf-text-secondary)" }}
                      >
                        Subtarefas
                      </h3>
                    </div>
                    <span
                      className="inline-flex items-center px-1.5 h-[17px] text-[0.625rem] font-medium"
                      style={{
                        color:
                          percentual === 100 ? "var(--tf-success)" : "var(--tf-text-tertiary)",
                        background:
                          percentual === 100 ? "var(--tf-success-bg)" : "transparent",
                        border: `1px solid ${percentual === 100 ? "var(--tf-success)" : "var(--tf-border)"}`,
                        borderRadius: "var(--tf-radius-xs)",
                        fontFamily: "var(--tf-font-mono)",
                      }}
                    >
                      {percentual}%
                    </span>
                  </div>
                  {/* Progress bar — slim, flat */}
                  <div
                    className="h-[3px] overflow-hidden mb-4"
                    style={{ background: "var(--tf-border)", borderRadius: "1px" }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${percentual}%`,
                        background:
                          percentual === 100 ? "var(--tf-success)" : "var(--tf-accent)",
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
            className="w-full md:w-[240px] shrink-0 border-t md:border-t-0 md:border-l overflow-y-auto max-h-[50vh] md:max-h-[75vh]"
            style={{
              borderColor: "var(--tf-border)",
              background: "var(--tf-bg-secondary)",
            }}
          >
            <div className="p-3 space-y-2">
              <div
                className="label-mono px-3 mb-1"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Propriedades
              </div>

              <div className="space-y-0.5">
                <PropertyRow
                  icon={<User size={13} strokeWidth={1.75} />}
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
                        <span
                          className="text-[0.625rem]"
                          style={{
                            color: "var(--tf-text-tertiary)",
                            fontFamily: "var(--tf-font-mono)",
                          }}
                        >
                          +{membrosDoCartao.length - 3}
                        </span>
                      )}
                    </div>
                  ) : null}
                </PropertyRow>

                <PropertyRow
                  icon={<Calendar size={13} strokeWidth={1.75} />}
                  label="Data"
                  onClick={() => setPainelAberto(painelAberto === "data" ? null : "data")}
                  active={painelAberto === "data"}
                >
                  {dataLocal ? (
                    <span
                      className="inline-flex items-center px-1.5 h-[17px] text-[0.625rem] font-medium"
                      style={{
                        color:
                          dataStatus === "vencido"
                            ? "#FFFFFF"
                            : dataStatus === "proximo"
                              ? "var(--tf-warning)"
                              : "var(--tf-text-secondary)",
                        background:
                          dataStatus === "vencido"
                            ? "var(--tf-danger)"
                            : dataStatus === "proximo"
                              ? "var(--tf-warning-bg)"
                              : "transparent",
                        border: `1px solid ${
                          dataStatus === "vencido"
                            ? "var(--tf-danger)"
                            : dataStatus === "proximo"
                              ? "var(--tf-warning)"
                              : "var(--tf-border)"
                        }`,
                        borderRadius: "var(--tf-radius-xs)",
                        fontFamily: "var(--tf-font-mono)",
                      }}
                    >
                      {formatarData(dataLocal)}
                    </span>
                  ) : null}
                </PropertyRow>

                <PropertyRow
                  icon={<Tag size={13} strokeWidth={1.75} />}
                  label="Etiquetas"
                  onClick={() =>
                    setPainelAberto(painelAberto === "etiquetas" ? null : "etiquetas")
                  }
                  active={painelAberto === "etiquetas"}
                >
                  {etiquetasDoCartao.length > 0 ? (
                    <div className="flex gap-0.5">
                      {etiquetasDoCartao.slice(0, 4).map((e) => (
                        <div
                          key={e.id}
                          className="w-3 h-3"
                          style={{
                            background: e.cor,
                            borderRadius: "1px",
                          }}
                          title={e.nome}
                        />
                      ))}
                    </div>
                  ) : null}
                </PropertyRow>

                <PropertyRow
                  icon={<Zap size={13} strokeWidth={1.75} />}
                  label="Story Points"
                  onClick={() => setPainelAberto(painelAberto === "peso" ? null : "peso")}
                  active={painelAberto === "peso"}
                >
                  {pesoLocal ? (
                    <span
                      className="inline-flex items-center justify-center h-[20px] min-w-[22px] px-1.5 text-[0.6875rem] font-semibold"
                      style={{
                        background: "var(--tf-accent-light)",
                        color: "var(--tf-accent-text)",
                        border: "1px solid var(--tf-accent)",
                        borderRadius: "var(--tf-radius-xs)",
                        fontFamily: "var(--tf-font-mono)",
                      }}
                    >
                      {pesoLocal}
                    </span>
                  ) : null}
                </PropertyRow>

                {cartao.workspace_id && (
                  <PropertyRow
                    icon={<GitPullRequest size={13} strokeWidth={1.75} />}
                    label="Pull Request"
                    onClick={() => setPainelAberto(painelAberto === "pr" ? null : "pr")}
                    active={painelAberto === "pr"}
                  >
                    {cartao.pr_numero ? (
                      <span
                        className="inline-flex items-center px-1.5 h-[17px] text-[0.625rem] font-medium"
                        style={{
                          background:
                            cartao.pr_status === "open"
                              ? "var(--tf-success-bg)"
                              : cartao.pr_status === "merged"
                                ? "var(--tf-merged-bg)"
                                : "var(--tf-danger-bg)",
                          color:
                            cartao.pr_status === "open"
                              ? "var(--tf-success)"
                              : cartao.pr_status === "merged"
                                ? "var(--tf-merged)"
                                : "var(--tf-danger)",
                          border: `1px solid ${
                            cartao.pr_status === "open"
                              ? "var(--tf-success)"
                              : cartao.pr_status === "merged"
                                ? "var(--tf-merged)"
                                : "var(--tf-danger)"
                          }`,
                          borderRadius: "var(--tf-radius-xs)",
                          fontFamily: "var(--tf-font-mono)",
                        }}
                      >
                        #{cartao.pr_numero}
                      </span>
                    ) : null}
                  </PropertyRow>
                )}

                <PropertyRow
                  icon={<GitBranch size={13} strokeWidth={1.75} />}
                  label="Branch"
                  onClick={() => setPainelAberto(painelAberto === "branch" ? null : "branch")}
                  active={painelAberto === "branch"}
                >
                  {cartao.branch ? (
                    <span
                      className="text-[0.625rem] truncate max-w-[90px]"
                      style={{
                        color: "var(--tf-text-secondary)",
                        fontFamily: "var(--tf-font-mono)",
                      }}
                    >
                      {cartao.branch}
                    </span>
                  ) : null}
                </PropertyRow>

                <PropertyRow
                  icon={<CheckSquare size={13} strokeWidth={1.75} />}
                  label="Checklist"
                  onClick={() => criarChecklist()}
                >
                  {totalItens > 0 ? (
                    <span
                      className="text-[0.625rem] font-medium"
                      style={{
                        color:
                          percentual === 100
                            ? "var(--tf-success)"
                            : "var(--tf-text-secondary)",
                        fontFamily: "var(--tf-font-mono)",
                      }}
                    >
                      {totalConcluidos}/{totalItens}
                    </span>
                  ) : (
                    <span
                      className="text-[0.625rem]"
                      style={{
                        color: "var(--tf-text-tertiary)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      + Criar
                    </span>
                  )}
                </PropertyRow>
              </div>

              {/* Melhorar com IA */}
              <button
                onClick={melhorarComIA}
                disabled={melhorandoIA}
                className="w-full flex items-center gap-2 h-8 px-3 transition-colors hover:bg-[var(--tf-accent-light)] disabled:opacity-50 outline-none"
                style={{
                  color: "var(--tf-accent-text)",
                  borderRadius: "var(--tf-radius-xs)",
                  border: "1px dashed var(--tf-accent)",
                }}
              >
                {melhorandoIA ? (
                  <Loader2 size={13} className="animate-spin" style={{ color: "var(--tf-accent)" }} />
                ) : (
                  <Sparkles size={13} strokeWidth={1.75} style={{ color: "var(--tf-accent)" }} />
                )}
                <span className="text-[0.75rem] font-medium">
                  {melhorandoIA ? "Melhorando…" : "Melhorar com IA"}
                </span>
              </button>

              {/* Activity summary */}
              {(anexos.length > 0 || comentarios.length > 0) && (
                <div
                  className="pt-3 mt-2 border-t space-y-1"
                  style={{ borderColor: "var(--tf-border)" }}
                >
                  <div
                    className="label-mono px-3 mb-1"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Atividade
                  </div>
                  {anexos.length > 0 && (
                    <div className="flex items-center gap-2 h-6 px-3">
                      <Paperclip
                        size={11}
                        strokeWidth={1.75}
                        style={{ color: "var(--tf-text-tertiary)" }}
                      />
                      <span
                        className="text-[0.6875rem]"
                        style={{
                          color: "var(--tf-text-secondary)",
                          fontFamily: "var(--tf-font-mono)",
                        }}
                      >
                        {anexos.length} {anexos.length === 1 ? "anexo" : "anexos"}
                      </span>
                    </div>
                  )}
                  {comentarios.length > 0 && (
                    <div className="flex items-center gap-2 h-6 px-3">
                      <Users
                        size={11}
                        strokeWidth={1.75}
                        style={{ color: "var(--tf-text-tertiary)" }}
                      />
                      <span
                        className="text-[0.6875rem]"
                        style={{
                          color: "var(--tf-text-secondary)",
                          fontFamily: "var(--tf-font-mono)",
                        }}
                      >
                        {comentarios.length} {comentarios.length === 1 ? "comentário" : "comentários"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Danger */}
              <div
                className="pt-3 mt-2 border-t"
                style={{ borderColor: "var(--tf-border)" }}
              >
                {!confirmExcluirCard ? (
                  <button
                    onClick={() => setConfirmExcluirCard(true)}
                    className="flex items-center gap-2 w-full h-8 px-3 text-[0.75rem] font-medium transition-colors hover:bg-[var(--tf-danger-bg)]"
                    style={{
                      color: "var(--tf-danger)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                    Excluir cartão
                  </button>
                ) : (
                  <div
                    className="p-3 space-y-2.5"
                    style={{
                      background: "var(--tf-danger-bg)",
                      border: "1px solid var(--tf-danger)",
                      borderRadius: "var(--tf-radius-sm)",
                    }}
                  >
                    <p
                      className="text-[0.75rem]"
                      style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
                    >
                      Checklists, anexos e comentários serão perdidos.
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          onExcluir(cartao.id);
                          onFechar();
                        }}
                        className="h-7 px-2.5 text-[0.6875rem] font-medium text-white transition-colors hover:brightness-110"
                        style={{
                          background: "var(--tf-danger)",
                          border: "1px solid var(--tf-danger)",
                          borderRadius: "var(--tf-radius-xs)",
                        }}
                      >
                        Sim, excluir
                      </button>
                      <button
                        onClick={() => setConfirmExcluirCard(false)}
                        className="h-7 px-2.5 text-[0.6875rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)]"
                        style={{
                          color: "var(--tf-text-secondary)",
                          border: "1px solid var(--tf-border)",
                          borderRadius: "var(--tf-radius-xs)",
                        }}
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
    </div>
  );
}
