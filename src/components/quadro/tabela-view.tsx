"use client";

import { CheckSquare, Paperclip, GitPullRequest } from "lucide-react";
import type { Coluna, Etiqueta, Membro } from "@/types";
import type { CartaoComResumo } from "@/hooks/use-cartoes";

interface TabelaViewProps {
  colunas: Coluna[];
  cartoesFiltradosPorColuna: Record<string, CartaoComResumo[]>;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onCartaoClick: (c: CartaoComResumo) => void;
}

function formatarData(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export function TabelaView({ colunas, cartoesFiltradosPorColuna, etiquetas, membros, onCartaoClick }: TabelaViewProps) {
  // Achatar todos os cards mantendo a coluna como referencia
  const linhas = colunas.flatMap((coluna) =>
    (cartoesFiltradosPorColuna[coluna.id] || []).map((card) => ({ card, coluna }))
  );

  if (linhas.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 lg:px-6 pb-6">
        <p className="text-[13px]" style={{ color: "var(--tf-text-tertiary)" }}>
          Nenhum card encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-4 lg:px-6 pb-6">
      <div
        className="rounded-[14px] border overflow-hidden"
        style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
      >
        <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--tf-surface-hover)", borderBottom: "1px solid var(--tf-border)" }}>
              {[
                { label: "Título", w: "auto" },
                { label: "Status", w: "120px" },
                { label: "Peso", w: "60px" },
                { label: "Entrega", w: "90px" },
                { label: "Etiquetas", w: "180px" },
                { label: "Membros", w: "100px" },
                { label: "Progresso", w: "90px" },
                { label: "PR", w: "70px" },
              ].map((col) => (
                <th
                  key={col.label}
                  className="text-left px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider"
                  style={{ color: "var(--tf-text-tertiary)", width: col.w }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ card, coluna }) => {
              const cardEtiquetas = etiquetas.filter((e) => card.etiqueta_ids.includes(e.id));
              const cardMembros = membros.filter((m) => card.membro_ids.includes(m.id));
              const concluido = !!card.data_conclusao;

              return (
                <tr
                  key={card.id}
                  onClick={() => onCartaoClick(card)}
                  className="cursor-pointer transition-colors"
                  style={{ borderTop: "1px solid var(--tf-border-subtle)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Titulo */}
                  <td className="px-3 py-2.5">
                    <span
                      className="font-semibold truncate block"
                      style={{
                        color: concluido ? "var(--tf-text-tertiary)" : "var(--tf-text)",
                        textDecoration: concluido ? "line-through" : "none",
                      }}
                    >
                      {card.titulo}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5">
                    <span
                      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}
                    >
                      {coluna.nome}
                    </span>
                  </td>

                  {/* Peso */}
                  <td className="px-3 py-2.5">
                    {card.peso != null ? (
                      <span
                        className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent)" }}
                      >
                        {card.peso}
                      </span>
                    ) : (
                      <span style={{ color: "var(--tf-text-tertiary)" }}>—</span>
                    )}
                  </td>

                  {/* Entrega */}
                  <td className="px-3 py-2.5" style={{ color: "var(--tf-text-secondary)" }}>
                    {formatarData(card.data_entrega)}
                  </td>

                  {/* Etiquetas */}
                  <td className="px-3 py-2.5">
                    {cardEtiquetas.length === 0 ? (
                      <span style={{ color: "var(--tf-text-tertiary)" }}>—</span>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        {cardEtiquetas.slice(0, 2).map((e) => (
                          <span
                            key={e.id}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${e.cor}22`, color: e.cor }}
                          >
                            {e.nome}
                          </span>
                        ))}
                        {cardEtiquetas.length > 2 && (
                          <span className="text-[9px]" style={{ color: "var(--tf-text-tertiary)" }}>
                            +{cardEtiquetas.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Membros */}
                  <td className="px-3 py-2.5">
                    {cardMembros.length === 0 ? (
                      <span style={{ color: "var(--tf-text-tertiary)" }}>—</span>
                    ) : (
                      <div className="flex items-center -space-x-1.5">
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
                  </td>

                  {/* Progresso (checklist + anexos) */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--tf-text-tertiary)" }}>
                      {card.total_checklist_itens > 0 && (
                        <span className="flex items-center gap-0.5">
                          <CheckSquare size={10} />
                          {card.total_checklist_concluidos}/{card.total_checklist_itens}
                        </span>
                      )}
                      {card.total_anexos > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Paperclip size={10} />
                          {card.total_anexos}
                        </span>
                      )}
                      {card.total_checklist_itens === 0 && card.total_anexos === 0 && <span>—</span>}
                    </div>
                  </td>

                  {/* PR */}
                  <td className="px-3 py-2.5">
                    {card.pr_numero ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold"
                        style={{ color: "var(--tf-accent)" }}
                      >
                        <GitPullRequest size={11} />
                        #{card.pr_numero}
                      </span>
                    ) : (
                      <span style={{ color: "var(--tf-text-tertiary)" }}>—</span>
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
