"use client";

import { useViewsSalvas } from "@/hooks/use-views-salvas";
import { toast } from "@/hooks/use-toast";
import { FiltrosSalvos, ViewSalva } from "@/types";
import {
  Bookmark,
  BookmarkPlus,
  Check,
  ChevronDown,
  Globe,
  Lock,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Filtros } from "./barra-filtros";

interface ViewsDropdownProps {
  workspaceId: string;
  quadroId: string;
  filtros: Filtros;
  onAplicar: (filtros: Filtros) => void;
}

/** Compara dois Filtros pra saber se a view atual ainda casa com os filtros aplicados. */
function filtrosCasam(a: Filtros, b: FiltrosSalvos): boolean {
  if ((a.texto || "") !== (b.texto || "")) return false;
  const aEtiq = [...(a.etiquetaIds || [])].sort();
  const bEtiq = [...(b.etiquetaIds || [])].sort();
  if (aEtiq.length !== bEtiq.length) return false;
  if (aEtiq.some((x, i) => x !== bEtiq[i])) return false;
  const aMem = [...(a.membroIds || [])].sort();
  const bMem = [...(b.membroIds || [])].sort();
  if (aMem.length !== bMem.length) return false;
  if (aMem.some((x, i) => x !== bMem[i])) return false;
  return true;
}

function chaveStorage(quadroId: string) {
  return `tf_view_ativa_${quadroId}`;
}

export function ViewsDropdown({
  workspaceId,
  quadroId,
  filtros,
  onAplicar,
}: ViewsDropdownProps) {
  const { views, criar, atualizar, excluir } = useViewsSalvas(workspaceId, quadroId);
  const [aberto, setAberto] = useState(false);
  const [modoSalvar, setModoSalvar] = useState<"closed" | "novo">("closed");
  const [novoNome, setNovoNome] = useState("");
  const [novoCompartilhada, setNovoCompartilhada] = useState(false);
  const [menuViewId, setMenuViewId] = useState<string | null>(null);
  const [renomeandoId, setRenomeandoId] = useState<string | null>(null);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const aplicouViewInicialRef = useRef(false);

  // Auto-aplica a última view ativa ao montar (uma vez).
  useEffect(() => {
    if (aplicouViewInicialRef.current) return;
    if (views.length === 0) return;
    const idSalvo = typeof window !== "undefined"
      ? localStorage.getItem(chaveStorage(quadroId))
      : null;
    if (!idSalvo) {
      aplicouViewInicialRef.current = true;
      return;
    }
    const view = views.find((v) => v.id === idSalvo);
    if (view) {
      aplicarView(view, { persistir: false });
    }
    aplicouViewInicialRef.current = true;
    // Intencional: só roda quando views terminam de carregar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views.length]);

  // Fecha dropdown ao clicar fora.
  useEffect(() => {
    if (!aberto) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setAberto(false);
        setMenuViewId(null);
        setRenomeandoId(null);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [aberto]);

  // Qual view está casando com os filtros atuais (se houver).
  const viewAtiva = useMemo(
    () => views.find((v) => filtrosCasam(filtros, v.filtros)) || null,
    [views, filtros]
  );

  // Mantém localStorage em sync com a view atualmente ativa.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (viewAtiva) {
      localStorage.setItem(chaveStorage(quadroId), viewAtiva.id);
    } else {
      localStorage.removeItem(chaveStorage(quadroId));
    }
  }, [viewAtiva, quadroId]);

  const aplicarView = useCallback(
    (view: ViewSalva, opts: { persistir?: boolean } = { persistir: true }) => {
      onAplicar({
        texto: view.filtros.texto || "",
        etiquetaIds: view.filtros.etiquetaIds || [],
        membroIds: view.filtros.membroIds || [],
      });
      setAberto(false);
      setMenuViewId(null);
      if (opts.persistir && typeof window !== "undefined") {
        localStorage.setItem(chaveStorage(quadroId), view.id);
      }
    },
    [onAplicar, quadroId]
  );

  async function handleCriar() {
    const nome = novoNome.trim();
    if (!nome) return;
    try {
      const view = await criar({
        nome,
        filtros: {
          texto: filtros.texto || undefined,
          etiquetaIds: filtros.etiquetaIds.length ? filtros.etiquetaIds : undefined,
          membroIds: filtros.membroIds.length ? filtros.membroIds : undefined,
        },
        compartilhada: novoCompartilhada,
      });
      if (view) {
        toast.success(`View "${nome}" salva`);
        if (typeof window !== "undefined") {
          localStorage.setItem(chaveStorage(quadroId), view.id);
        }
      }
      setModoSalvar("closed");
      setNovoNome("");
      setNovoCompartilhada(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar view";
      toast.error(msg);
    }
  }

  async function handleAtualizarFiltros(view: ViewSalva) {
    await atualizar(view.id, {
      filtros: {
        texto: filtros.texto || undefined,
        etiquetaIds: filtros.etiquetaIds.length ? filtros.etiquetaIds : undefined,
        membroIds: filtros.membroIds.length ? filtros.membroIds : undefined,
      },
    });
    toast.success(`View "${view.nome}" atualizada`);
    setMenuViewId(null);
  }

  async function handleRenomear(view: ViewSalva) {
    const novo = nomeEdicao.trim();
    if (!novo || novo === view.nome) {
      setRenomeandoId(null);
      return;
    }
    await atualizar(view.id, { nome: novo });
    setRenomeandoId(null);
    setMenuViewId(null);
  }

  async function handleExcluir(view: ViewSalva) {
    if (!confirm(`Excluir view "${view.nome}"?`)) return;
    await excluir(view.id);
    toast.success("View excluída");
    setMenuViewId(null);
  }

  const temFiltrosAtivos =
    !!filtros.texto || filtros.etiquetaIds.length > 0 || filtros.membroIds.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label="Views salvas"
        className="flex items-center gap-1.5 h-7 px-2.5 text-[0.75rem] font-medium transition-colors"
        style={{
          background: viewAtiva ? "var(--tf-accent-light)" : "transparent",
          color: viewAtiva ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
          border: `1px solid ${viewAtiva ? "var(--tf-accent)" : "var(--tf-border)"}`,
          borderRadius: "var(--tf-radius-xs)",
        }}
      >
        <Bookmark size={12} strokeWidth={1.75} />
        <span className="max-w-[120px] truncate">
          {viewAtiva ? viewAtiva.nome : "Views"}
        </span>
        <ChevronDown size={11} strokeWidth={2} />
      </button>

      {aberto && (
        <div
          className="absolute top-full left-0 mt-1.5 w-[280px] z-50 overflow-hidden"
          style={{
            background: "var(--tf-surface-raised)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-md)",
            boxShadow: "var(--tf-shadow-md)",
          }}
        >
          {/* Lista de views */}
          <div className="max-h-[260px] overflow-y-auto py-1.5 px-1.5">
            {views.length === 0 ? (
              <p
                className="text-[0.75rem] text-center py-4"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                Nenhuma view salva
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {views.map((v) => {
                  const ativa = viewAtiva?.id === v.id;
                  const editandoEsta = renomeandoId === v.id;
                  return (
                    <li key={v.id} className="relative">
                      {editandoEsta ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleRenomear(v);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1.5"
                          style={{
                            background: "var(--tf-bg-secondary)",
                            borderRadius: "var(--tf-radius-xs)",
                          }}
                        >
                          <input
                            autoFocus
                            value={nomeEdicao}
                            onChange={(e) => setNomeEdicao(e.target.value)}
                            onBlur={() => handleRenomear(v)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setRenomeandoId(null);
                                setMenuViewId(null);
                              }
                            }}
                            className="flex-1 bg-transparent outline-none text-[0.8125rem]"
                            style={{ color: "var(--tf-text)" }}
                          />
                        </form>
                      ) : (
                        <button
                          onClick={() => aplicarView(v)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
                          style={{
                            background: ativa ? "var(--tf-accent-light)" : "transparent",
                            borderRadius: "var(--tf-radius-xs)",
                          }}
                          onMouseEnter={(e) => {
                            if (!ativa) e.currentTarget.style.background = "var(--tf-surface-hover)";
                          }}
                          onMouseLeave={(e) => {
                            if (!ativa) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {v.compartilhada ? (
                            <Globe size={11} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
                          ) : (
                            <Lock size={11} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
                          )}
                          <span
                            className="flex-1 truncate text-[0.8125rem]"
                            style={{
                              color: ativa ? "var(--tf-accent-text)" : "var(--tf-text)",
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {v.nome}
                          </span>
                          {ativa && <Check size={11} strokeWidth={2} style={{ color: "var(--tf-accent)" }} />}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuViewId(menuViewId === v.id ? null : v.id);
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label="Mais opções"
                            className="opacity-60 hover:opacity-100 cursor-pointer"
                          >
                            <MoreVertical size={11} strokeWidth={1.75} />
                          </span>
                        </button>
                      )}

                      {/* Menu de ações por view */}
                      {menuViewId === v.id && (
                        <div
                          className="absolute right-1 top-full mt-0.5 z-10 w-44 py-1 overflow-hidden"
                          style={{
                            background: "var(--tf-surface-raised)",
                            border: "1px solid var(--tf-border)",
                            borderRadius: "var(--tf-radius-xs)",
                            boxShadow: "var(--tf-shadow-md)",
                          }}
                        >
                          <button
                            onClick={() => handleAtualizarFiltros(v)}
                            disabled={!temFiltrosAtivos}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[0.75rem] text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ color: "var(--tf-text)" }}
                            onMouseEnter={(e) => {
                              if (!e.currentTarget.disabled)
                                e.currentTarget.style.background = "var(--tf-surface-hover)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <RefreshCw size={11} strokeWidth={1.75} />
                            Salvar filtros atuais
                          </button>
                          <button
                            onClick={() => {
                              setRenomeandoId(v.id);
                              setNomeEdicao(v.nome);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[0.75rem] text-left transition-colors"
                            style={{ color: "var(--tf-text)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "var(--tf-surface-hover)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <Pencil size={11} strokeWidth={1.75} />
                            Renomear
                          </button>
                          <button
                            onClick={() =>
                              atualizar(v.id, { compartilhada: !v.compartilhada }).then(() => {
                                toast.success(
                                  v.compartilhada
                                    ? "View agora é privada"
                                    : "View compartilhada com o workspace"
                                );
                                setMenuViewId(null);
                              })
                            }
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[0.75rem] text-left transition-colors"
                            style={{ color: "var(--tf-text)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "var(--tf-surface-hover)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {v.compartilhada ? (
                              <>
                                <Lock size={11} strokeWidth={1.75} />
                                Tornar privada
                              </>
                            ) : (
                              <>
                                <Globe size={11} strokeWidth={1.75} />
                                Compartilhar
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleExcluir(v)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[0.75rem] text-left transition-colors"
                            style={{ color: "var(--tf-danger)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "var(--tf-danger-bg)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <Trash2 size={11} strokeWidth={1.75} />
                            Excluir
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer: salvar view atual */}
          <div
            className="px-1.5 py-1.5"
            style={{ borderTop: "1px solid var(--tf-border)" }}
          >
            {modoSalvar === "closed" ? (
              <button
                onClick={() => setModoSalvar("novo")}
                disabled={!temFiltrosAtivos}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[0.75rem] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  color: "var(--tf-accent-text)",
                  background: "var(--tf-accent-light)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
              >
                <BookmarkPlus size={12} strokeWidth={1.75} />
                {temFiltrosAtivos
                  ? "Salvar filtros atuais como view"
                  : "Aplique filtros para salvar"}
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCriar();
                }}
                className="flex flex-col gap-1.5"
              >
                <input
                  autoFocus
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome da view"
                  className="h-7 px-2 text-[0.75rem] outline-none"
                  style={{
                    background: "var(--tf-surface)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-xs)",
                    color: "var(--tf-text)",
                  }}
                />
                <label
                  className="flex items-center gap-1.5 px-1 text-[0.6875rem] cursor-pointer"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  <input
                    type="checkbox"
                    checked={novoCompartilhada}
                    onChange={(e) => setNovoCompartilhada(e.target.checked)}
                    className="cursor-pointer"
                  />
                  Compartilhar com o workspace
                </label>
                <div className="flex gap-1">
                  <button
                    type="submit"
                    disabled={!novoNome.trim()}
                    className="flex-1 h-7 text-[0.6875rem] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: "var(--tf-accent)",
                      color: "#fff",
                      borderRadius: "var(--tf-radius-xs)",
                      fontFamily: "var(--tf-font-mono)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoSalvar("closed");
                      setNovoNome("");
                      setNovoCompartilhada(false);
                    }}
                    className="flex-1 h-7 text-[0.6875rem] font-medium"
                    style={{
                      color: "var(--tf-text-secondary)",
                      background: "var(--tf-bg-secondary)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
