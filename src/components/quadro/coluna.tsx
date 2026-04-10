"use client";

import { cn } from "@/lib/utils";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { Coluna as ColunaType, Etiqueta, Membro } from "@/types";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Gauge, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Dropdown, DropdownItem } from "../ui/dropdown";
import { Cartao } from "./cartao";
import { NovoCartao } from "./novo-cartao";

interface ColunaProps {
  coluna: ColunaType;
  index: number;
  cartoes: CartaoComResumo[];
  etiquetas: Etiqueta[];
  membros: Membro[];
  onCriarCartao: (colunaId: string, titulo: string, peso?: number | null) => void;
  onCartaoClick: (cartao: CartaoComResumo) => void;
  onRenomear: (nome: string) => void;
  onExcluir: () => void;
}

export const Coluna = memo(function Coluna({
  coluna, index, cartoes, etiquetas, membros,
  onCriarCartao, onCartaoClick, onRenomear, onExcluir,
}: ColunaProps) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(coluna.nome);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `coluna-${coluna.id}`, data: { type: "coluna", coluna },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const pesoTotal = useMemo(() => cartoes.reduce((acc, c) => acc + (c.peso || 0), 0), [cartoes]);

  const handleCriarCartao = useCallback(
    (titulo: string, peso?: number | null) => onCriarCartao(coluna.id, titulo, peso),
    [onCriarCartao, coluna.id]
  );

  function salvarNome() {
    const n = nome.trim();
    if (n && n !== coluna.nome) onRenomear(n);
    else setNome(coluna.nome);
    setEditando(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex flex-col w-[290px] min-w-[290px] max-w-[290px] shrink-0 max-h-full column-surface",
        isDragging && "opacity-50"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 cursor-grab active:cursor-grabbing"
        {...attributes} {...listeners}
      >
        {editando ? (
          <input
            ref={inputRef}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={salvarNome}
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvarNome();
              if (e.key === "Escape") { setNome(coluna.nome); setEditando(false); }
            }}
            className="flex-1 text-sm font-semibold rounded-[8px] px-2 py-1 outline-none"
            style={{
              color: "var(--tf-text)", background: "var(--tf-surface)",
              border: "2px solid var(--tf-accent)",
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="text-[13px] font-bold tracking-tight truncate" style={{ color: "var(--tf-text)" }}>
              {coluna.nome}
            </h3>
            <span
              className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[8px] shrink-0"
              style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}
            >
              {cartoes.length}
            </span>
            {pesoTotal > 0 && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-[8px] shrink-0"
                style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}
              >
                <Gauge size={9} />
                {pesoTotal}
              </span>
            )}
          </div>
        )}
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={
              <button
                className="p-1 rounded-[8px] hover:bg-[var(--tf-surface-hover)]"
                style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
                aria-label={`Opções da coluna ${coluna.nome}`}
              >
                <MoreHorizontal size={16} />
              </button>
            }
          >
            <DropdownItem onClick={() => { setEditando(true); setTimeout(() => inputRef.current?.focus(), 50); }}>
              <Pencil size={14} /> Renomear
            </DropdownItem>
            <DropdownItem perigo onClick={() => setConfirmExcluir(true)}>
              <Trash2 size={14} /> Excluir coluna
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-1 space-y-2 min-h-[8px] scroll-inset">
        <SortableContext items={cartoes.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cartoes.map((cartao) => (
            <Cartao key={cartao.id} cartao={cartao} etiquetas={etiquetas} membros={membros} onClick={() => onCartaoClick(cartao)} />
          ))}
        </SortableContext>
      </div>

      <div className="px-2.5 pb-2.5 mt-1">
        <NovoCartao onCriar={handleCriarCartao} />
      </div>

      {/* Confirmação de exclusão */}
      {confirmExcluir && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[20px]" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="p-4 rounded-[14px] mx-4 space-y-3" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border)" }}>
            <p className="text-[13px] font-bold" style={{ color: "var(--tf-text)" }}>
              Excluir &quot;{coluna.nome}&quot;?
            </p>
            <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
              {cartoes.length > 0
                ? `${cartoes.length} card${cartoes.length > 1 ? "s" : ""} nesta coluna também ${cartoes.length > 1 ? "serão excluídos" : "será excluído"}.`
                : "Esta coluna está vazia."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmExcluir(false)}
                className="flex-1 px-3 py-2 text-[12px] font-semibold rounded-[8px]"
                style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmExcluir(false); onExcluir(); }}
                className="flex-1 px-3 py-2 text-[12px] font-semibold rounded-[8px] text-white"
                style={{ background: "var(--tf-danger)" }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
