"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckSquare, Paperclip, Calendar, GitPullRequest } from "lucide-react";
import type { Coluna, Etiqueta, Membro } from "@/types";
import type { CartaoComResumo } from "@/hooks/use-cartoes";
import { getContrastTextColor } from "@/lib/colors";

interface ListaViewProps {
  colunas: Coluna[];
  cartoesFiltradosPorColuna: Record<string, CartaoComResumo[]>;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onCartaoClick: (c: CartaoComResumo) => void;
}

function formatarData(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export function ListaView({ colunas, cartoesFiltradosPorColuna, etiquetas, membros, onCartaoClick }: ListaViewProps) {
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
      <div className="max-w-5xl mx-auto space-y-3">
        {colunas.map((coluna) => {
          const cards = cartoesFiltradosPorColuna[coluna.id] || [];
          const colapsada = colapsadas.has(coluna.id);

          return (
            <div
              key={coluna.id}
              className="rounded-[14px] border overflow-hidden"
              style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
            >
              {/* Header da coluna */}
              <button
                onClick={() => toggleColuna(coluna.id)}
                className="w-full flex items-center gap-2 px-4 py-3"
                style={{ background: "var(--tf-surface-hover)", borderBottom: "1px solid var(--tf-border)" }}
              >
                {colapsada ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "var(--tf-text)" }}>
                  {coluna.nome}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--tf-surface)", color: "var(--tf-text-tertiary)" }}>
                  {cards.length}
                </span>
              </button>

              {/* Cards */}
              {!colapsada && (
                <div className="divide-y" style={{ borderColor: "var(--tf-border-subtle)" }}>
                  {cards.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
                      Nenhum card
                    </div>
                  ) : (
                    cards.map((card) => {
                      const cardEtiquetas = etiquetas.filter((e) => card.etiqueta_ids.includes(e.id));
                      const cardMembros = membros.filter((m) => card.membro_ids.includes(m.id));
                      const concluido = !!card.data_conclusao;

                      return (
                        <button
                          key={card.id}
                          onClick={() => onCartaoClick(card)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--tf-bg-secondary)]"
                        >
                          {/* Checkbox visual */}
                          <div
                            className="w-4 h-4 rounded-[4px] border shrink-0 flex items-center justify-center"
                            style={{
                              borderColor: concluido ? "var(--tf-success)" : "var(--tf-border)",
                              background: concluido ? "var(--tf-success)" : "transparent",
                            }}
                          >
                            {concluido && <span className="text-white text-[10px]">✓</span>}
                          </div>

                          {/* Titulo */}
                          <span
                            className="flex-1 text-[13px] font-medium truncate"
                            style={{
                              color: concluido ? "var(--tf-text-tertiary)" : "var(--tf-text)",
                              textDecoration: concluido ? "line-through" : "none",
                            }}
                          >
                            {card.titulo}
                          </span>

                          {/* Etiquetas */}
                          {cardEtiquetas.length > 0 && (
                            <div className="hidden md:flex items-center gap-1 shrink-0">
                              {cardEtiquetas.slice(0, 3).map((e) => (
                                <span
                                  key={e.id}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: e.cor, color: getContrastTextColor(e.cor) }}
                                >
                                  {e.nome}
                                </span>
                              ))}
                              {cardEtiquetas.length > 3 && (
                                <span className="text-[9px]" style={{ color: "var(--tf-text-tertiary)" }}>
                                  +{cardEtiquetas.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Indicadores */}
                          <div className="flex items-center gap-2 shrink-0 text-[10px]" style={{ color: "var(--tf-text-tertiary)" }}>
                            {card.total_checklist_itens > 0 && (
                              <span className="flex items-center gap-0.5">
                                <CheckSquare size={11} />
                                {card.total_checklist_concluidos}/{card.total_checklist_itens}
                              </span>
                            )}
                            {card.total_anexos > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Paperclip size={11} />
                                {card.total_anexos}
                              </span>
                            )}
                            {card.pr_numero && (
                              <span className="flex items-center gap-0.5" style={{ color: "var(--tf-accent)" }}>
                                <GitPullRequest size={11} />
                                #{card.pr_numero}
                              </span>
                            )}
                            {card.data_entrega && (
                              <span className="flex items-center gap-0.5">
                                <Calendar size={11} />
                                {formatarData(card.data_entrega)}
                              </span>
                            )}
                          </div>

                          {/* Peso */}
                          {card.peso != null && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent)" }}
                            >
                              {card.peso}
                            </span>
                          )}

                          {/* Membros */}
                          {cardMembros.length > 0 && (
                            <div className="flex items-center -space-x-1.5 shrink-0">
                              {cardMembros.slice(0, 3).map((m) => (
                                <div
                                  key={m.id}
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2"
                                  style={{ background: m.cor_avatar, borderColor: "var(--tf-surface)" }}
                                  title={m.nome}
                                >
                                  {m.avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.avatar_url} alt={m.nome} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    m.nome.charAt(0).toUpperCase()
                                  )}
                                </div>
                              ))}
                              {cardMembros.length > 3 && (
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2"
                                  style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)", borderColor: "var(--tf-surface)" }}
                                >
                                  +{cardMembros.length - 3}
                                </div>
                              )}
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
