"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import {
  Kanban,
  X,
  Calendar,
  Weight,
  GitBranch,
  GitPullRequest,
  CheckSquare,
  ExternalLink,
  Tag,
  Loader2,
} from "lucide-react";

// ==========================================
// Tipos locais para o popup
// ==========================================
interface CardPreview {
  titulo: string;
  descricao: string | null;
  peso: number | null;
  workspace_id: string | null;
}

interface CardFull {
  id: string;
  titulo: string;
  descricao: string | null;
  peso: number | null;
  workspace_id: string | null;
  data_entrega: string | null;
  data_conclusao: string | null;
  branch: string | null;
  pr_url: string | null;
  pr_status: "open" | "closed" | "merged" | null;
  pr_numero: number | null;
  criado_em: string;
  atualizado_em: string;
}

interface ChecklistResumo {
  titulo: string;
  total: number;
  concluidos: number;
}

interface EtiquetaResumo {
  nome: string;
  cor: string;
}

// ==========================================
// Popup de detalhes do card
// ==========================================
function CardPopup({
  cardId,
  onFechar,
}: {
  cardId: string;
  onFechar: () => void;
}) {
  const [card, setCard] = useState<CardFull | null>(null);
  const [checklists, setChecklists] = useState<ChecklistResumo[]>([]);
  const [etiquetas, setEtiquetas] = useState<EtiquetaResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Fetch card + checklists + etiquetas em paralelo
      const [cardRes, checkRes, etqRes] = await Promise.all([
        supabase
          .from("cartoes")
          .select("id, titulo, descricao, peso, workspace_id, data_entrega, data_conclusao, branch, pr_url, pr_status, pr_numero, criado_em, atualizado_em")
          .eq("id", cardId)
          .single(),
        supabase
          .from("checklists")
          .select("titulo, checklist_itens(concluido)")
          .eq("cartao_id", cardId),
        supabase
          .from("cartao_etiquetas")
          .select("etiqueta:etiquetas(nome, cor)")
          .eq("cartao_id", cardId),
      ]);

      if (cardRes.data) setCard(cardRes.data as CardFull);

      if (checkRes.data) {
        setChecklists(
          (checkRes.data as { titulo: string; checklist_itens: { concluido: boolean }[] }[]).map((cl) => ({
            titulo: cl.titulo,
            total: cl.checklist_itens.length,
            concluidos: cl.checklist_itens.filter((i) => i.concluido).length,
          })),
        );
      }

      if (etqRes.data) {
        setEtiquetas(
          (etqRes.data as unknown as { etiqueta: { nome: string; cor: string } | null }[])
            .filter((e) => e.etiqueta)
            .map((e) => ({ nome: e.etiqueta!.nome, cor: e.etiqueta!.cor })),
        );
      }

      setLoading(false);
    }
    load();
  }, [cardId]);

  // Fechar com Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onFechar]);

  const prStatusLabel = (status: string | null) => {
    if (status === "open") return { text: "Aberto", color: "#22c55e" };
    if (status === "merged") return { text: "Merged", color: "#a855f7" };
    if (status === "closed") return { text: "Fechado", color: "#ef4444" };
    return null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onFechar}
      />

      {/* Popup */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card?.titulo || "Detalhes do card"}
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[520px] max-h-[80vh] flex flex-col rounded-[20px] overflow-hidden"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          boxShadow: "var(--tf-shadow-lg)",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={24}
              className="animate-spin"
              style={{ color: "var(--tf-accent)" }}
            />
          </div>
        ) : card ? (
          <>
            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 px-6 pt-5 pb-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--tf-accent-light)" }}
                >
                  <Kanban size={18} style={{ color: "var(--tf-accent-text)" }} />
                </div>
                <div className="min-w-0">
                  <h3
                    className="text-[16px] font-semibold leading-tight"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {card.titulo}
                  </h3>
                  {etiquetas.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {etiquetas.map((etq) => (
                        <span
                          key={etq.nome}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            background: `${etq.cor}20`,
                            color: etq.cor,
                          }}
                        >
                          {etq.nome}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onFechar}
                className="p-1.5 rounded-[8px] hover:bg-[var(--tf-surface-hover)] transition-colors shrink-0"
                style={{ color: "var(--tf-text-tertiary)" }}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-5">
              {/* Descricao */}
              {card.descricao && (
                <p
                  className="text-[13px] leading-relaxed mb-4"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  {card.descricao}
                </p>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {card.peso && (
                  <MetaItem
                    icon={<Weight size={13} />}
                    label="Story Points"
                    value={`${card.peso} pts`}
                  />
                )}
                {card.data_entrega && (
                  <MetaItem
                    icon={<Calendar size={13} />}
                    label="Entrega"
                    value={new Date(card.data_entrega).toLocaleDateString("pt-BR")}
                  />
                )}
                {card.branch && (
                  <MetaItem
                    icon={<GitBranch size={13} />}
                    label="Branch"
                    value={card.branch}
                  />
                )}
                {card.pr_url && (
                  <MetaItem
                    icon={<GitPullRequest size={13} />}
                    label={`PR #${card.pr_numero}`}
                    value={prStatusLabel(card.pr_status)?.text || ""}
                    valueColor={prStatusLabel(card.pr_status)?.color}
                  />
                )}
              </div>

              {/* Checklists */}
              {checklists.length > 0 && (
                <div className="mb-4">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Checklists
                  </p>
                  {checklists.map((cl) => (
                    <div key={cl.titulo} className="flex items-center gap-2 mb-1.5">
                      <CheckSquare
                        size={13}
                        style={{
                          color: cl.concluidos === cl.total && cl.total > 0
                            ? "var(--tf-accent)"
                            : "var(--tf-text-tertiary)",
                        }}
                      />
                      <span
                        className="text-[13px] flex-1"
                        style={{ color: "var(--tf-text-secondary)" }}
                      >
                        {cl.titulo}
                      </span>
                      <span
                        className="text-[11px] font-medium"
                        style={{
                          color: cl.concluidos === cl.total && cl.total > 0
                            ? "var(--tf-accent)"
                            : "var(--tf-text-tertiary)",
                        }}
                      >
                        {cl.concluidos}/{cl.total}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Data de criacao */}
              <p
                className="text-[11px] mt-2"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Criado em{" "}
                {new Date(card.criado_em).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-2 px-6 py-3 border-t"
              style={{ borderColor: "var(--tf-border)" }}
            >
              <a
                href={`/workspace/${card.workspace_id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors hover:bg-[var(--tf-surface-hover)]"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                <ExternalLink size={12} />
                Abrir no board
              </a>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-16">
            <p
              className="text-[13px]"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Card nao encontrado
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function MetaItem({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-[8px]"
      style={{ background: "var(--tf-bg-secondary)" }}
    >
      <span style={{ color: "var(--tf-text-tertiary)" }}>{icon}</span>
      <div className="min-w-0">
        <p
          className="text-[10px] uppercase tracking-wider"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          {label}
        </p>
        <p
          className="text-[12px] font-medium truncate"
          style={{ color: valueColor || "var(--tf-text)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ==========================================
// NodeView React — preview de um card
// ==========================================
function CardEmbedView(props: ReactNodeViewProps) {
  const node = props.node;
  const [card, setCard] = useState<CardPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [popupAberto, setPopupAberto] = useState(false);

  const cardId = node.attrs.cardId as string;

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("cartoes")
        .select("titulo, descricao, peso, workspace_id")
        .eq("id", cardId)
        .single();
      setCard(data);
      setLoading(false);
    }
    if (cardId) load();
  }, [cardId]);

  const handleClick = useCallback(() => {
    if (card) setPopupAberto(true);
  }, [card]);

  return (
    <NodeViewWrapper className="my-2">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-[12px] border transition-colors hover:bg-[var(--tf-surface-hover)]"
        style={{
          background: "var(--tf-surface)",
          borderColor: "var(--tf-border)",
          cursor: card ? "pointer" : "default",
        }}
        contentEditable={false}
        onClick={card ? handleClick : undefined}
        title={card ? "Clique para ver detalhes" : undefined}
      >
        <div
          className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
          style={{ background: "var(--tf-accent-light)" }}
        >
          <Kanban
            size={16}
            style={{ color: "var(--tf-accent-text)" }}
          />
        </div>
        {loading ? (
          <span
            className="text-[13px]"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Carregando card...
          </span>
        ) : card ? (
          <div className="flex-1 min-w-0">
            <p
              className="text-[14px] font-medium truncate"
              style={{ color: "var(--tf-text)" }}
            >
              {card.titulo}
            </p>
            {(card.peso || card.descricao) && (
              <div className="flex items-center gap-2 mt-0.5">
                {card.peso && (
                  <span
                    className="text-[11px] flex items-center gap-1"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {card.peso} pts
                  </span>
                )}
                {card.descricao && (
                  <span
                    className="text-[11px] truncate"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {card.descricao.substring(0, 80)}
                    {card.descricao.length > 80 ? "..." : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <span
            className="text-[13px]"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Card nao encontrado
          </span>
        )}
      </div>

      {popupAberto && (
        <CardPopup
          cardId={cardId}
          onFechar={() => setPopupAberto(false)}
        />
      )}
    </NodeViewWrapper>
  );
}

// ==========================================
// TipTap Node Extension
// ==========================================
export const CardEmbed = Node.create({
  name: "cardEmbed",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      cardId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="card-embed"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "card-embed" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardEmbedView);
  },
});
