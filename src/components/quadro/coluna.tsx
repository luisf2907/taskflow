"use client";

import { cn } from "@/lib/utils";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { Coluna as ColunaType, Etiqueta, Membro } from "@/types";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Gauge, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Dropdown, DropdownItem } from "../ui/dropdown";
import { Cartao } from "./cartao";
import { NovoCartao } from "./novo-cartao";

interface ColunaProps {
  coluna: ColunaType;
  cartoes: CartaoComResumo[];
  etiquetas: Etiqueta[];
  membros: Membro[];
  onCriarCartao: (colunaId: string, titulo: string) => void;
  onCartaoClick: (cartao: CartaoComResumo) => void;
  onRenomear: (nome: string) => void;
  onExcluir: () => void;
}

export function Coluna({
  coluna, cartoes, etiquetas, membros,
  onCriarCartao, onCartaoClick, onRenomear, onExcluir,
}: ColunaProps) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(coluna.nome);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `coluna-${coluna.id}`, data: { type: "coluna", coluna },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const pesoTotal = cartoes.reduce((acc, c) => acc + (c.peso || 0), 0);

  const handleCriarCartao = useCallback(
    (titulo: string) => onCriarCartao(coluna.id, titulo),
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
        "flex flex-col w-[272px] min-w-[272px] max-w-[272px] column-surface shrink-0 max-h-[calc(100vh-160px)]",
        isDragging && "opacity-50"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-grab active:cursor-grabbing"
        {...attributes} {...listeners}
      >
        {editando ? (
          <input
            ref={inputRef}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={salvarNome}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvarNome();
              if (e.key === "Escape") { setNome(coluna.nome); setEditando(false); }
            }}
            className="flex-1 text-sm font-semibold rounded-md px-2 py-1 outline-none"
            style={{
              color: "var(--tf-text)", background: "var(--tf-surface)",
              border: "2px solid var(--tf-accent)",
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 className="text-[13px] font-semibold flex items-center gap-2 flex-1 min-w-0" style={{ color: "var(--tf-text)" }}>
            <span className="truncate">{coluna.nome}</span>
            <span className="text-[11px] font-normal" style={{ color: "var(--tf-text-tertiary)" }}>
              {cartoes.length}
            </span>
            {pesoTotal > 0 && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}
              >
                <Gauge size={9} />
                {pesoTotal}
              </span>
            )}
          </h3>
        )}
        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={
              <button className="p-1 rounded-md transition-smooth" style={{ color: "var(--tf-text-tertiary)" }}>
                <MoreHorizontal size={16} />
              </button>
            }
          >
            <DropdownItem onClick={() => { setEditando(true); setTimeout(() => inputRef.current?.focus(), 50); }}>
              <Pencil size={14} /> Renomear
            </DropdownItem>
            <DropdownItem perigo onClick={onExcluir}>
              <Trash2 size={14} /> Excluir coluna
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-1 space-y-1.5 min-h-[8px]">
        <SortableContext items={cartoes.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cartoes.map((cartao) => (
            <Cartao key={cartao.id} cartao={cartao} etiquetas={etiquetas} membros={membros} onClick={() => onCartaoClick(cartao)} />
          ))}
        </SortableContext>
      </div>

      <div className="px-2 pb-2">
        <NovoCartao onCriar={handleCriarCartao} />
      </div>
    </div>
  );
}
