"use client";

import { ChecklistComItens, ChecklistItem } from "@/types";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { duration, easeOutExpo, springSnappy } from "@/lib/motion/presets";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";

// ────────────────────────────────────────────────
// Checkbox animado (scale do fundo + path-draw do check)
// ────────────────────────────────────────────────

interface AnimatedCheckboxProps {
  checked: boolean;
  onToggle: () => void;
}

function AnimatedCheckbox({ checked, onToggle }: AnimatedCheckboxProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={reduceMotion ? undefined : { scale: 0.88 }}
      transition={springSnappy}
      className="relative shrink-0 w-[14px] h-[14px] outline-none"
      style={{ borderRadius: "var(--tf-radius-xs)" }}
      role="checkbox"
      aria-checked={checked}
    >
      {/* Trilho vazio — sempre presente, transiciona cor da borda */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          border: `1px solid ${
            checked ? "var(--tf-accent)" : "var(--tf-border-strong)"
          }`,
          borderRadius: "var(--tf-radius-xs)",
          transition: "border-color 160ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      />

      {/* Fundo accent que cresce de dentro pra fora quando marca */}
      <AnimatePresence initial={false}>
        {checked && (
          <motion.span
            key="fill"
            aria-hidden
            className="absolute inset-0"
            style={{
              background: "var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              transformOrigin: "center",
            }}
            initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.4, transition: { duration: duration.fast } }
            }
            transition={springSnappy}
          />
        )}
      </AnimatePresence>

      {/* Check — desenha o path quando marca */}
      <AnimatePresence initial={false}>
        {checked && (
          <motion.svg
            key="check"
            aria-hidden
            viewBox="0 0 12 12"
            width="12"
            height="12"
            fill="none"
            stroke="white"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute inset-0 m-auto"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: duration.instant } }}
            transition={{ duration: duration.instant }}
          >
            <motion.path
              d="M2.5 6.2 L5 8.5 L9.5 3.8"
              initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0, transition: { duration: duration.fast } }}
              transition={{
                duration: duration.normal,
                ease: easeOutExpo,
                // Pequeno delay pra check aparecer depois do fundo acabar de crescer
                delay: reduceMotion ? 0 : 0.06,
              }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ────────────────────────────────────────────────
// Texto do item — risco animado + fade de cor
// ────────────────────────────────────────────────

function ItemLabel({ texto, checked }: { texto: string; checked: boolean }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <span
      className="relative text-[0.8125rem] flex-1 leading-snug"
      style={{
        color: checked ? "var(--tf-text-tertiary)" : "var(--tf-text)",
        letterSpacing: "-0.005em",
        transition: "color 200ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      <span className="relative inline-block">
        {texto}
        {/* Linha do strikethrough — scaleX animado */}
        <motion.span
          aria-hidden
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: "50%",
            height: 1,
            background: "currentColor",
            transformOrigin: "left center",
          }}
          initial={false}
          animate={{ scaleX: checked ? 1 : 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: duration.normal, ease: easeOutExpo }
          }
        />
      </span>
    </span>
  );
}

// ────────────────────────────────────────────────
// Linha do item — arrastavel, texto editavel no lugar
// ────────────────────────────────────────────────

interface ItemLinhaProps {
  item: ChecklistItem;
  onToggle: () => void;
  onRenomear: (texto: string) => void;
  onExcluir: () => void;
}

function ItemLinha({ item, onToggle, onRenomear, onExcluir }: ItemLinhaProps) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(item.texto);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  function confirmar() {
    const texto = rascunho.trim();
    if (texto && texto !== item.texto) onRenomear(texto);
    else setRascunho(item.texto);
    setEditando(false);
  }

  function abrirEdicao() {
    setRascunho(item.texto);
    setEditando(true);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderRadius: "var(--tf-radius-xs)",
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
      }}
      className="tf-linha-toque flex items-center gap-1.5 min-h-[34px] py-1 pl-1 pr-1.5 group/item transition-colors hover:bg-[var(--tf-surface-hover)]"
    >
      {/* Alca de arraste — tambem move por teclado (setas) quando focada */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="shrink-0 p-1 tf-acao-toque opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
        style={{ color: "var(--tf-text-tertiary)", borderRadius: "var(--tf-radius-xs)" }}
        aria-label={`Reordenar "${item.texto}"`}
      >
        <GripVertical size={13} strokeWidth={1.75} />
      </button>

      <AnimatedCheckbox checked={item.concluido} onToggle={onToggle} />

      {editando ? (
        <input
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          maxLength={200}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              confirmar();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setRascunho(item.texto);
              setEditando(false);
            }
          }}
          className="checklist-item-input flex-1 min-w-0 h-7 px-2 text-[0.8125rem] outline-none"
          style={{
            color: "var(--tf-text)",
            letterSpacing: "-0.005em",
            borderRadius: "var(--tf-radius-xs)",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={abrirEdicao}
          className="flex-1 min-w-0 flex text-left px-1 py-0.5 cursor-text"
          style={{ borderRadius: "var(--tf-radius-xs)" }}
          title="Clique para editar"
        >
          <ItemLabel texto={item.texto} checked={item.concluido} />
        </button>
      )}

      <button
        type="button"
        onClick={onExcluir}
        className="shrink-0 p-1.5 tf-acao-toque opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 transition-colors transition-opacity hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
        style={{
          color: "var(--tf-text-tertiary)",
          borderRadius: "var(--tf-radius-xs)",
        }}
        aria-label={`Excluir "${item.texto}"`}
      >
        <Trash2 size={14} strokeWidth={1.75} />
      </button>

      <style jsx>{`
        .checklist-item-input {
          background: var(--tf-surface);
          border: 1px solid var(--tf-accent);
        }
      `}</style>
    </div>
  );
}

interface ChecklistProps {
  checklist: ChecklistComItens;
  onToggleItem: (itemId: string, concluido: boolean) => void;
  onCriarItem: (checklistId: string, texto: string) => void;
  onRenomearItem: (itemId: string, texto: string) => void;
  onExcluirItem: (itemId: string) => void;
  onReordenarItens: (checklistId: string, itens: ChecklistItem[]) => void;
  onExcluirChecklist: (checklistId: string) => void;
}

export function ChecklistComponent({
  checklist,
  onToggleItem,
  onCriarItem,
  onRenomearItem,
  onExcluirItem,
  onReordenarItens,
  onExcluirChecklist,
}: ChecklistProps) {
  const [novoItem, setNovoItem] = useState("");
  const [adicionando, setAdicionando] = useState(false);

  // Mesma config do quadro: distancia no mouse pra nao roubar o clique,
  // delay no toque pra nao roubar o scroll.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleCriar() {
    if (!novoItem.trim()) return;
    onCriarItem(checklist.id, novoItem.trim());
    setNovoItem("");
  }

  function handleDragEnd(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    const itens = checklist.checklist_itens;
    const de = itens.findIndex((i) => i.id === active.id);
    const para = itens.findIndex((i) => i.id === over.id);
    if (de === -1 || para === -1) return;
    onReordenarItens(checklist.id, arrayMove(itens, de, para));
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
          className="p-1.5 tf-acao-toque opacity-0 group-hover/checklist:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
          style={{
            color: "var(--tf-text-tertiary)",
            borderRadius: "var(--tf-radius-xs)",
          }}
          title="Excluir checklist"
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* Items */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={checklist.checklist_itens.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0.5">
            {checklist.checklist_itens.map((item) => (
              <ItemLinha
                key={item.id}
                item={item}
                onToggle={() => onToggleItem(item.id, !item.concluido)}
                onRenomear={(texto) => onRenomearItem(item.id, texto)}
                onExcluir={() => onExcluirItem(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add item */}
      {adicionando ? (
        <div className="mt-2 space-y-1.5">
          <input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            placeholder="Novo item…"
            maxLength={200}
            className="checklist-input w-full h-9 px-3 text-[0.8125rem] outline-none"
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
              className="h-8 px-3 text-[0.75rem] font-medium text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
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
          className="flex items-center gap-1.5 mt-1.5 px-2.5 h-8 text-[0.75rem] transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
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
