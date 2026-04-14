"use client";

import { supabase } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Search, Kanban, X } from "lucide-react";

interface CardResumo {
  id: string;
  titulo: string;
  descricao: string | null;
  peso: number | null;
}

interface CardEmbedPickerProps {
  workspaceId: string;
  aberto: boolean;
  onFechar: () => void;
  onSelecionar: (cardId: string) => void;
}

export function CardEmbedPicker({
  workspaceId,
  aberto,
  onFechar,
  onSelecionar,
}: CardEmbedPickerProps) {
  const [cards, setCards] = useState<CardResumo[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);

  // set-state-in-effect intencional: reage à abertura do modal.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    setBusca("");

    supabase
      .from("cartoes")
      .select("id, titulo, descricao, peso")
      .eq("workspace_id", workspaceId)
      .order("criado_em", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setCards((data as CardResumo[]) || []);
        setCarregando(false);
      });
  }, [aberto, workspaceId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtrados = busca
    ? cards.filter((c) =>
        c.titulo.toLowerCase().includes(busca.toLowerCase()),
      )
    : cards;

  const handleSelecionar = useCallback(
    (cardId: string) => {
      onSelecionar(cardId);
      onFechar();
    },
    [onSelecionar, onFechar],
  );

  if (!aberto) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onFechar} />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Incorporar card"
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] max-h-[70vh] flex flex-col rounded-[16px] overflow-hidden"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          boxShadow: "var(--tf-shadow-lg)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--tf-border)" }}
        >
          <h3
            className="text-[15px] font-semibold"
            style={{ color: "var(--tf-text)" }}
          >
            Incorporar card
          </h3>
          <button
            type="button"
            onClick={onFechar}
            className="p-1 rounded-[6px] hover:bg-[var(--tf-surface-hover)] transition-colors"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Busca */}
        <div className="px-4 py-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-[10px]"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
            }}
          >
            <Search size={14} style={{ color: "var(--tf-text-tertiary)" }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar card pelo titulo..."
              aria-label="Buscar card"
              autoFocus
              className="flex-1 text-[13px] outline-none bg-transparent"
              style={{ color: "var(--tf-text)" }}
            />
          </div>
        </div>

        {/* Lista de cards */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {carregando ? (
            <div
              className="flex items-center justify-center py-8 text-[13px]"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Carregando cards...
            </div>
          ) : filtrados.length === 0 ? (
            <div
              className="flex items-center justify-center py-8 text-[13px]"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              {busca ? "Nenhum card encontrado" : "Nenhum card neste workspace"}
            </div>
          ) : (
            filtrados.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleSelecionar(card.id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[10px] text-left transition-colors hover:bg-[var(--tf-surface-hover)]"
              >
                <div
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                  style={{ background: "var(--tf-accent-light)" }}
                >
                  <Kanban
                    size={14}
                    style={{ color: "var(--tf-accent-text)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--tf-text)" }}
                  >
                    {card.titulo}
                  </p>
                  {(card.peso || card.descricao) && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {card.peso && (
                        <span
                          className="text-[11px]"
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
                          {card.descricao.substring(0, 60)}
                          {card.descricao.length > 60 ? "..." : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
