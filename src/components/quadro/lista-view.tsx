"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Paperclip,
  Calendar,
  GitPullRequest,
  Check,
} from "lucide-react";
import type { Coluna, Etiqueta, Membro } from "@/types";
import type { CartaoComResumo } from "@/hooks/use-cartoes";
import { getContrastTextColor } from "@/lib/colors";
import { Avatar } from "./avatar";

interface ListaViewProps {
  colunas: Coluna[];
  cartoesFiltradosPorColuna: Record<string, CartaoComResumo[]>;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onCartaoClick: (c: CartaoComResumo) => void;
}

function formatarData(d: string | null): string {
  if (!d) return "";
  return new Date(d)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
}

export function ListaView({
  colunas,
  cartoesFiltradosPorColuna,
  etiquetas,
  membros,
  onCartaoClick,
}: ListaViewProps) {
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());

  function toggleColuna(id: string) {
    setColapsadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 lg:px-6 pb-6">
      <div className="max-w-5xl mx-auto space-y-2">
        {colunas.map((coluna) => {
          const cards = cartoesFiltradosPorColuna[coluna.id] || [];
          const colapsada = colapsadas.has(coluna.id);

          return (
            <div
              key={coluna.id}
              className="overflow-hidden"
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-md)",
              }}
            >
              {/* Header da coluna */}
              <button
                onClick={() => toggleColuna(coluna.id)}
                className="w-full flex items-center gap-2 px-3 h-9 transition-colors hover:bg-[var(--tf-surface-hover)]"
                style={{
                  background: "var(--tf-bg-secondary)",
                  borderBottom: colapsada ? "none" : "1px solid var(--tf-border)",
                }}
              >
                {colapsada ? (
                  <ChevronRight size={12} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
                ) : (
                  <ChevronDown size={12} strokeWidth={1.75} style={{ color: "var(--tf-text-tertiary)" }} />
                )}
                <span
                  className="label-mono"
                  style={{ color: "var(--tf-text)" }}
                >
                  {coluna.nome}
                </span>
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-[17px] px-1 text-[0.625rem] font-medium"
                  style={{
                    background: "var(--tf-surface)",
                    color: "var(--tf-text-tertiary)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                  }}
                >
                  {cards.length}
                </span>
              </button>

              {/* Cards */}
              {!colapsada && (
                <div>
                  {cards.length === 0 ? (
                    <div
                      className="px-4 py-6 text-center text-[0.6875rem]"
                      style={{
                        color: "var(--tf-text-tertiary)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Nenhum card
                    </div>
                  ) : (
                    cards.map((card, i) => {
                      const cardEtiquetas = etiquetas.filter((e) =>
                        card.etiqueta_ids.includes(e.id)
                      );
                      const cardMembros = membros.filter((m) =>
                        card.membro_ids.includes(m.id)
                      );
                      const concluido = !!card.data_conclusao;

                      return (
                        <button
                          key={card.id}
                          onClick={() => onCartaoClick(card)}
                          className="w-full flex items-center gap-2.5 px-3 h-9 text-left transition-colors hover:bg-[var(--tf-surface-hover)]"
                          style={{
                            borderTop: i > 0 ? "1px solid var(--tf-border-subtle)" : "none",
                          }}
                        >
                          {/* Checkbox */}
                          <div
                            className="w-[14px] h-[14px] shrink-0 flex items-center justify-center"
                            style={{
                              border: `1px solid ${concluido ? "var(--tf-success)" : "var(--tf-border-strong)"}`,
                              background: concluido ? "var(--tf-success)" : "transparent",
                              borderRadius: "var(--tf-radius-xs)",
                            }}
                          >
                            {concluido && (
                              <Check size={9} className="text-white" strokeWidth={3} />
                            )}
                          </div>

                          {/* Titulo */}
                          <span
                            className="flex-1 text-[0.8125rem] font-medium truncate"
                            style={{
                              color: concluido
                                ? "var(--tf-text-tertiary)"
                                : "var(--tf-text)",
                              textDecoration: concluido ? "line-through" : "none",
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {card.titulo}
                          </span>

                          {/* Etiquetas */}
                          {cardEtiquetas.length > 0 && (
                            <div className="hidden md:flex items-center gap-0.5 shrink-0">
                              {cardEtiquetas.slice(0, 3).map((e) => (
                                <span
                                  key={e.id}
                                  className="inline-flex items-center h-[16px] px-1.5 text-[0.5625rem] font-medium leading-none"
                                  style={{
                                    background: e.cor,
                                    color: getContrastTextColor(e.cor),
                                    borderRadius: "var(--tf-radius-xs)",
                                    letterSpacing: "0.01em",
                                  }}
                                >
                                  {e.nome}
                                </span>
                              ))}
                              {cardEtiquetas.length > 3 && (
                                <span
                                  className="text-[0.5625rem]"
                                  style={{
                                    color: "var(--tf-text-tertiary)",
                                    fontFamily: "var(--tf-font-mono)",
                                  }}
                                >
                                  +{cardEtiquetas.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Indicadores */}
                          <div
                            className="flex items-center gap-2 shrink-0 text-[0.625rem]"
                            style={{
                              color: "var(--tf-text-tertiary)",
                              fontFamily: "var(--tf-font-mono)",
                            }}
                          >
                            {card.total_checklist_itens > 0 && (
                              <span className="flex items-center gap-0.5">
                                <CheckSquare size={10} strokeWidth={1.75} />
                                {card.total_checklist_concluidos}/{card.total_checklist_itens}
                              </span>
                            )}
                            {card.total_anexos > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Paperclip size={10} strokeWidth={1.75} />
                                {card.total_anexos}
                              </span>
                            )}
                            {card.pr_numero && (
                              <span
                                className="flex items-center gap-0.5"
                                style={{ color: "var(--tf-accent)" }}
                              >
                                <GitPullRequest size={10} strokeWidth={1.75} />
                                #{card.pr_numero}
                              </span>
                            )}
                            {card.data_entrega && (
                              <span className="flex items-center gap-0.5">
                                <Calendar size={10} strokeWidth={1.75} />
                                {formatarData(card.data_entrega)}
                              </span>
                            )}
                          </div>

                          {/* Peso */}
                          {card.peso != null && (
                            <span
                              className="inline-flex items-center justify-center min-w-[22px] h-[17px] px-1.5 text-[0.625rem] font-medium shrink-0"
                              style={{
                                background: "var(--tf-accent-light)",
                                color: "var(--tf-accent-text)",
                                border: "1px solid var(--tf-accent)",
                                borderRadius: "var(--tf-radius-xs)",
                                fontFamily: "var(--tf-font-mono)",
                              }}
                            >
                              {card.peso}
                            </span>
                          )}

                          {/* Membros */}
                          {cardMembros.length > 0 && (
                            <div className="shrink-0">
                              <div className="flex -space-x-1">
                                {cardMembros.slice(0, 3).map((m) => (
                                  <div
                                    key={m.id}
                                    style={{
                                      outline: "2px solid var(--tf-surface)",
                                      borderRadius: "var(--tf-radius-xs)",
                                    }}
                                  >
                                    <Avatar membro={m} tamanho="sm" />
                                  </div>
                                ))}
                                {cardMembros.length > 3 && (
                                  <div
                                    className="w-6 h-6 flex items-center justify-center text-[0.5625rem] font-semibold text-white"
                                    style={{
                                      background: "var(--tf-text-tertiary)",
                                      borderRadius: "var(--tf-radius-xs)",
                                      outline: "2px solid var(--tf-surface)",
                                      fontFamily: "var(--tf-font-mono)",
                                    }}
                                  >
                                    +{cardMembros.length - 3}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
