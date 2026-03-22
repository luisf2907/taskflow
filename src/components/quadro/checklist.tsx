"use client";

import { ChecklistComItens } from "@/types";
import { Check, Plus, Square, Trash2, X } from "lucide-react";
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
          {checklist.titulo}
        </h4>
        <button
          onClick={() => onExcluirChecklist(checklist.id)}
          className="p-1 rounded-[4px] opacity-0 group-hover:opacity-100 hover:bg-[var(--tf-danger-bg)]"
          style={{ color: "var(--tf-text-tertiary)", transition: "opacity 0.15s ease, background 0.15s ease" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-danger)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
          title="Excluir checklist"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Items */}
      <div className="space-y-0.5">
        {checklist.checklist_itens.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2.5 py-1.5 px-2 rounded-[8px] group/item hover:bg-[var(--tf-bg-secondary)]"
            style={{ transition: "background 0.15s ease" }}
          >
            <button
              onClick={() => onToggleItem(item.id, !item.concluido)}
              className="mt-0.5 shrink-0"
            >
              {item.concluido ? (
                <div
                  className="w-4 h-4 rounded-[4px] flex items-center justify-center"
                  style={{ background: "var(--tf-accent)" }}
                >
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              ) : (
                <div
                  className="w-4 h-4 rounded-[4px]"
                  style={{ border: "2px solid var(--tf-border)" }}
                />
              )}
            </button>
            <span
              className="text-[13px] flex-1 leading-snug"
              style={{
                color: item.concluido ? "var(--tf-text-tertiary)" : "var(--tf-text)",
                textDecoration: item.concluido ? "line-through" : "none",
              }}
            >
              {item.texto}
            </span>
            <button
              onClick={() => onExcluirItem(item.id)}
              className="p-0.5 rounded-[4px] opacity-0 group-hover/item:opacity-100 hover:bg-[var(--tf-danger-bg)]"
              style={{ color: "var(--tf-text-tertiary)", transition: "opacity 0.15s ease, background 0.15s ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-danger)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Add item */}
      {adicionando ? (
        <div
          className="mt-2 rounded-[14px] overflow-hidden"
          style={{
            background: "var(--tf-bg-secondary)",
            border: "2px solid var(--tf-accent)",
          }}
        >
          <input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            placeholder="Novo item..."
            className="w-full bg-transparent px-3 py-2.5 text-[13px] outline-none"
            style={{ color: "var(--tf-text)" }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCriar();
              if (e.key === "Escape") setAdicionando(false);
            }}
          />
          <div className="flex items-center gap-2 px-3 pb-2.5">
            <button
              onClick={handleCriar}
              className="px-3 py-1 text-[11px] font-semibold text-white rounded-[8px]"
              style={{ background: "var(--tf-accent)" }}
            >
              Adicionar
            </button>
            <button
              onClick={() => { setAdicionando(false); setNovoItem(""); }}
              className="p-1 rounded-[4px] hover:bg-[var(--tf-surface-hover)]"
              style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdicionando(true)}
          className="flex items-center gap-1.5 mt-2 px-2 py-1.5 text-[12px] font-medium rounded-[8px] hover:bg-[var(--tf-bg-secondary)]"
          style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
        >
          <Plus size={13} />
          Adicionar item
        </button>
      )}
    </div>
  );
}
