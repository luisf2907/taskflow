"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { Kanban } from "lucide-react";

// ==========================================
// NodeView React — preview de um card
// ==========================================
function CardEmbedView(props: ReactNodeViewProps) {
  const node = props.node;
  const [card, setCard] = useState<{
    titulo: string;
    descricao: string | null;
    peso: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const cardId = node.attrs.cardId as string;

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("cartoes")
        .select("titulo, descricao, peso")
        .eq("id", cardId)
        .single();
      setCard(data);
      setLoading(false);
    }
    if (cardId) load();
  }, [cardId]);

  return (
    <NodeViewWrapper className="my-2">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-[12px] border"
        style={{
          background: "var(--tf-surface)",
          borderColor: "var(--tf-border)",
        }}
        contentEditable={false}
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
            Card não encontrado
          </span>
        )}
      </div>
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
