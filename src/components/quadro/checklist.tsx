"use client";

import { ChecklistComItens } from "@/types";
import { CheckSquare, Plus, Square, Trash2, X } from "lucide-react";
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

  const total = checklist.checklist_itens.length;
  const concluidos = checklist.checklist_itens.filter((i) => i.concluido).length;
  const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  function handleCriar() {
    if (!novoItem.trim()) return;
    onCriarItem(checklist.id, novoItem.trim());
    setNovoItem("");
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-[var(--trello-text-subtle)]" />
          <h4 className="text-sm font-semibold text-[var(--trello-text)]">
            {checklist.titulo}
          </h4>
        </div>
        <button
          onClick={() => onExcluirChecklist(checklist.id)}
          className="p-1 rounded-[3px] text-[var(--trello-text-subtle)] hover:text-[#C9372C] hover:bg-[var(--trello-hover)] transition-smooth"
          title="Excluir checklist"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--trello-text-subtle)] w-8 text-right">
            {percentual}%
          </span>
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--trello-border)" }}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentual === 100
                  ? "bg-[#4BCE97]"
                  : "bg-[#0C66E4]"
              }`}
              style={{ width: `${percentual}%` }}
            />
          </div>
        </div>
      )}

      {/* Itens */}
      <div className="space-y-0.5">
        {checklist.checklist_itens.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 group py-1 px-1 rounded-[3px] hover:bg-[var(--trello-hover)] transition-smooth"
          >
            <button
              onClick={() => onToggleItem(item.id, !item.concluido)}
              className="mt-0.5 shrink-0 text-[var(--trello-text-subtle)] hover:text-[#0C66E4] transition-smooth"
            >
              {item.concluido ? (
                <CheckSquare size={16} className="text-[#4BCE97]" />
              ) : (
                <Square size={16} />
              )}
            </button>
            <span
              className={`text-sm flex-1 ${
                item.concluido
                  ? "line-through text-[var(--trello-text-subtle)]"
                  : "text-[var(--trello-text)]"
              }`}
            >
              {item.texto}
            </span>
            <button
              onClick={() => onExcluirItem(item.id)}
              className="p-0.5 rounded-[3px] text-[var(--trello-text-subtle)] opacity-0 group-hover:opacity-100 hover:text-[#C9372C] transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Adicionar item */}
      {adicionando ? (
        <div className="flex gap-2">
          <input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            placeholder="Adicionar item..."
            className="flex-1 px-2 py-1.5 text-sm rounded-[3px] outline-none focus:ring-2 focus:ring-[var(--trello-blue)] text-[var(--trello-text)]"
            style={{
              background: "var(--trello-card)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--trello-border)",
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCriar();
              if (e.key === "Escape") setAdicionando(false);
            }}
          />
          <button
            onClick={handleCriar}
            className="px-3 py-1.5 text-xs font-medium bg-[#0C66E4] text-white rounded-[3px] hover:bg-[#0055CC] transition-smooth"
          >
            Adicionar
          </button>
          <button
            onClick={() => {
              setAdicionando(false);
              setNovoItem("");
            }}
            className="px-2 py-1.5 text-xs text-[var(--trello-text-subtle)] hover:text-[var(--trello-text)]"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdicionando(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-[var(--trello-text-subtle)] hover:text-[#0C66E4] hover:bg-[var(--trello-hover)] rounded-[3px] transition-smooth"
        >
          <Plus size={14} />
          Adicionar item
        </button>
      )}
    </div>
  );
}
