"use client";

import { ChecklistComItens } from "@/types";
import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

interface ChecklistProps {
  checklist: ChecklistComItens;
  onToggleItem: (itemId: string, concluido: boolean) => void;
  onCriarItem: (checklistId: string, texto: string) => void;
  onExcluirItem: (itemId: string) => void;
  onExcluirChecklist: (checklistId: string) => void;
}

export function ChecklistComponent({
  checklist,
  onToggleItem,
  onCriarItem,
  onExcluirItem,
  onExcluirChecklist,
}: ChecklistProps) {
  const [novoItem, setNovoItem] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  function handleCriar() {
    if (!novoItem.trim()) return;
    onCriarItem(checklist.id, novoItem.trim());
    setNovoItem("");
  }

  return (
    <div className="group/checklist">
      {/* Header — label-mono uppercase */}
      <div className="flex items-center justify-between mb-2">
        <h4
          className="label-mono"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          {checklist.titulo}
        </h4>
        <button
          onClick={() => onExcluirChecklist(checklist.id)}
          className="p-1 opacity-0 group-hover/checklist:opacity-100 transition-opacity hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
          style={{
            color: "var(--tf-text-tertiary)",
            borderRadius: "var(--tf-radius-xs)",
          }}
          title="Excluir checklist"
        >
          <Trash2 size={11} strokeWidth={1.75} />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-0.5">
        {checklist.checklist_itens.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 py-1 px-2 group/item transition-colors hover:bg-[var(--tf-surface-hover)]"
            style={{ borderRadius: "var(--tf-radius-xs)" }}
          >
            <button
              onClick={() => onToggleItem(item.id, !item.concluido)}
              className="mt-0.5 shrink-0"
            >
              {item.concluido ? (
                <div
                  className="w-[14px] h-[14px] flex items-center justify-center"
                  style={{
                    background: "var(--tf-accent)",
                    border: "1px solid var(--tf-accent)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                >
                  <Check size={9} className="text-white" strokeWidth={3} />
                </div>
              ) : (
                <div
                  className="w-[14px] h-[14px] transition-colors hover:border-[var(--tf-accent)]"
                  style={{
                    border: "1px solid var(--tf-border-strong)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                />
              )}
            </button>
            <span
              className="text-[0.8125rem] flex-1 leading-snug"
              style={{
                color: item.concluido ? "var(--tf-text-tertiary)" : "var(--tf-text)",
                textDecoration: item.concluido ? "line-through" : "none",
                letterSpacing: "-0.005em",
              }}
            >
              {item.texto}
            </span>
            <button
              onClick={() => onExcluirItem(item.id)}
              className="p-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
              style={{
                color: "var(--tf-text-tertiary)",
                borderRadius: "var(--tf-radius-xs)",
              }}
              aria-label="Excluir item"
            >
              <Trash2 size={10} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>

      {/* Add item */}
      {adicionando ? (
        <div className="mt-2 space-y-1.5">
          <input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            placeholder="Novo item…"
            maxLength={200}
            className="checklist-input w-full h-8 px-2.5 text-[0.8125rem] outline-none"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.005em",
              borderRadius: "var(--tf-radius-xs)",
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCriar();
              if (e.key === "Escape") setAdicionando(false);
            }}
          />
          <style jsx>{`
            .checklist-input {
              background: var(--tf-surface);
              border: 1px solid var(--tf-border);
              transition: border-color 0.15s ease;
            }
            .checklist-input:focus {
              border-color: var(--tf-accent);
            }
          `}</style>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCriar}
              disabled={!novoItem.trim()}
              className="h-7 px-2.5 text-[0.75rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--tf-accent)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            >
              Adicionar
            </button>
            <button
              onClick={() => {
                setAdicionando(false);
                setNovoItem("");
              }}
              className="p-1.5 transition-colors hover:text-[var(--tf-text)]"
              style={{ color: "var(--tf-text-tertiary)" }}
              aria-label="Cancelar"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdicionando(true)}
          className="flex items-center gap-1.5 mt-1.5 px-2 h-7 text-[0.75rem] transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
          style={{
            color: "var(--tf-text-tertiary)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Plus size={12} strokeWidth={1.75} />
          Adicionar item
        </button>
      )}
    </div>
  );
}
