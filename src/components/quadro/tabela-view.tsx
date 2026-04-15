"use client";

import { CheckSquare, Paperclip, GitPullRequest } from "lucide-react";
import type { Coluna, Etiqueta, Membro } from "@/types";
import type { CartaoComResumo } from "@/hooks/use-cartoes";
import { getContrastTextColor } from "@/lib/colors";
import { Avatar } from "./avatar";

interface TabelaViewProps {
  colunas: Coluna[];
  cartoesFiltradosPorColuna: Record<string, CartaoComResumo[]>;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onCartaoClick: (c: CartaoComResumo) => void;
}

function formatarData(d: string | null): string {
  if (!d) return "—";
  return new Date(d)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
}

export function TabelaView({
  colunas,
  cartoesFiltradosPorColuna,
  etiquetas,
  membros,
  onCartaoClick,
}: TabelaViewProps) {
  const linhas = colunas.flatMap((coluna) =>
    (cartoesFiltradosPorColuna[coluna.id] || []).map((card) => ({ card, coluna }))
  );

  if (linhas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 lg:px-6 pb-6">
        <p
          className="text-[0.75rem]"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
          }}
        >
          Nenhum card encontrado
        </p>
      </div>
    );
  }

  const empty = (
    <span
      style={{
        color: "var(--tf-text-tertiary)",
        fontFamily: "var(--tf-font-mono)",
      }}
    >
      —
    </span>
  );

  return (
    <div className="flex-1 overflow-auto px-4 lg:px-6 pb-6">
      <div
        className="overflow-hidden"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        <table
          className="w-full text-[0.75rem]"
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr
              style={{
                background: "var(--tf-bg-secondary)",
                borderBottom: "1px solid var(--tf-border)",
              }}
            >
              {[
                { label: "Título", w: "auto" },
                { label: "Status", w: "120px" },
                { label: "Peso", w: "64px" },
                { label: "Entrega", w: "90px" },
                { label: "Etiquetas", w: "180px" },
                { label: "Membros", w: "110px" },
                { label: "Progresso", w: "100px" },
                { label: "PR", w: "72px" },
              ].map((col) => (
                <th
                  key={col.label}
                  className="text-left px-3 h-9 font-medium text-[0.625rem] uppercase"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    width: col.w,
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ card, coluna }, i) => {
              const cardEtiquetas = etiquetas.filter((e) =>
                card.etiqueta_ids.includes(e.id)
              );
              const cardMembros = membros.filter((m) =>
                card.membro_ids.includes(m.id)
              );
              const concluido = !!card.data_conclusao;

              return (
                <tr
                  key={card.id}
                  onClick={() => onCartaoClick(card)}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--tf-border-subtle)" : "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--tf-surface-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* Titulo */}
                  <td className="px-3 h-9">
                    <span
                      className="font-medium truncate block"
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
                  </td>

                  {/* Status */}
                  <td className="px-3">
                    <span
                      className="inline-flex items-center h-[17px] px-1.5 text-[0.625rem] font-medium"
                      style={{
                        background: "var(--tf-bg-secondary)",
                        color: "var(--tf-text-secondary)",
                        border: "1px solid var(--tf-border)",
                        borderRadius: "var(--tf-radius-xs)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {coluna.nome}
                    </span>
                  </td>

                  {/* Peso */}
                  <td className="px-3">
                    {card.peso != null ? (
                      <span
                        className="inline-flex items-center justify-center min-w-[22px] h-[17px] px-1.5 text-[0.625rem] font-medium"
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
                    ) : (
                      empty
                    )}
                  </td>

                  {/* Entrega */}
                  <td
                    className="px-3"
                    style={{
                      color: "var(--tf-text-secondary)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    {formatarData(card.data_entrega)}
                  </td>

                  {/* Etiquetas */}
                  <td className="px-3">
                    {cardEtiquetas.length === 0 ? (
                      empty
                    ) : (
                      <div className="flex items-center gap-0.5 flex-wrap">
                        {cardEtiquetas.slice(0, 2).map((e) => (
                          <span
                            key={e.id}
                            className="inline-flex items-center h-[16px] px-1.5 text-[0.5625rem] font-medium"
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
                        {cardEtiquetas.length > 2 && (
                          <span
                            className="text-[0.5625rem]"
                            style={{
                              color: "var(--tf-text-tertiary)",
                              fontFamily: "var(--tf-font-mono)",
                            }}
                          >
                            +{cardEtiquetas.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Membros */}
                  <td className="px-3">
                    {cardMembros.length === 0 ? (
                      empty
                    ) : (
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
                    )}
                  </td>

                  {/* Progresso */}
                  <td className="px-3">
                    <div
                      className="flex items-center gap-2 text-[0.625rem]"
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
                      {card.total_checklist_itens === 0 &&
                        card.total_anexos === 0 &&
                        empty}
                    </div>
                  </td>

                  {/* PR */}
                  <td className="px-3">
                    {card.pr_numero ? (
                      <span
                        className="inline-flex items-center gap-1 text-[0.625rem] font-medium"
                        style={{
                          color: "var(--tf-accent)",
                          fontFamily: "var(--tf-font-mono)",
                        }}
                      >
                        <GitPullRequest size={10} strokeWidth={1.75} />#{card.pr_numero}
                      </span>
                    ) : (
                      empty
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
