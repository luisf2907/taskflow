"use client";

import { cn } from "@/lib/utils";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { Coluna as ColunaType, Etiqueta, Membro } from "@/types";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
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
  coluna,
  cartoes,
  etiquetas,
  membros,
  onCriarCartao,
  onCartaoClick,
  onRenomear,
  onExcluir,
}: ColunaProps) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(coluna.nome);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, active } = useSortable({
    id: `coluna-${coluna.id}`,
    data: { type: "coluna", coluna },
  });

  // Realca a coluna quando um cartao esta sendo arrastado sobre ela
  // (ou sobre um cartao dentro dela). `isOver` do useSortable so cobre
  // o caso do ponteiro estar exatamente sobre o wrapper, entao tambem
  // verificamos se o active pertence a esta coluna.
  const isCardDrag = active?.data.current?.type === "cartao";
  const arrastandoCartaoDeOutraColuna =
    isCardDrag && active?.data.current?.cartao?.coluna_id !== coluna.id;
  const estaSendoAlvo = isOver && arrastandoCartaoDeOutraColuna;

  const style = { transform: CSS.Transform.toString(transform), transition };
  const pesoTotal = useMemo(
    () => cartoes.reduce((acc, c) => acc + (c.peso || 0), 0),
    [cartoes]
  );

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
      data-dnd-target={estaSendoAlvo ? "true" : undefined}
      className={cn(
        "relative flex flex-col w-[86vw] min-w-[86vw] max-w-[86vw] md:w-[290px] md:min-w-[290px] md:max-w-[290px] shrink-0 max-h-full column-surface snap-start",
        isDragging && "opacity-50",
        "tf-dnd-target"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 pt-3 pb-2 cursor-grab active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
        {...attributes}
        {...listeners}
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
              if (e.key === "Escape") {
                setNome(coluna.nome);
                setEditando(false);
              }
            }}
            className="flex-1 text-[0.8125rem] font-semibold px-1.5 py-0.5 outline-none"
            style={{
              color: "var(--tf-text)",
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.01em",
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <h3
              className="text-[0.75rem] font-semibold uppercase truncate"
              style={{
                color: "var(--tf-text)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.06em",
              }}
            >
              {coluna.nome}
            </h3>
            <span
              className="inline-flex items-center justify-center min-w-[18px] h-[17px] px-1 text-[0.625rem] font-medium shrink-0"
              style={{
                background: "var(--tf-bg-secondary)",
                color: "var(--tf-text-tertiary)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              {cartoes.length}
            </span>
            {pesoTotal > 0 && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 h-[17px] text-[0.625rem] font-medium shrink-0"
                style={{
                  background: "var(--tf-accent-light)",
                  color: "var(--tf-accent-text)",
                  border: "1px solid var(--tf-accent)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                <Gauge size={9} strokeWidth={2} />
                {pesoTotal}
              </span>
            )}
          </div>
        )}
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Dropdown
            trigger={
              <button
                className="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded-[var(--tf-radius-xs)] transition-colors hover:bg-[var(--tf-surface-hover)]"
                style={{ color: "var(--tf-text-tertiary)" }}
                aria-label={`Opções da coluna ${coluna.nome}`}
              >
                <MoreHorizontal size={14} strokeWidth={1.75} />
              </button>
            }
          >
            <DropdownItem
              onClick={() => {
                setEditando(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
            >
              <Pencil size={12} strokeWidth={1.75} /> Renomear
            </DropdownItem>
            <DropdownItem perigo onClick={() => setConfirmExcluir(true)}>
              <Trash2 size={12} strokeWidth={1.75} /> Excluir coluna
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-1 space-y-1.5 min-h-[8px] scroll-inset">
        <SortableContext
          items={cartoes.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cartoes.map((cartao) => (
            <Cartao
              key={cartao.id}
              cartao={cartao}
              etiquetas={etiquetas}
              membros={membros}
              onClick={() => onCartaoClick(cartao)}
            />
          ))}
        </SortableContext>
      </div>

      <div className="px-2 pb-2 mt-1">
        <NovoCartao onCriar={handleCriarCartao} />
      </div>

      {/* Confirmação de exclusão */}
      {confirmExcluir && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-[var(--tf-radius-lg)]"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            className="p-3.5 mx-4 space-y-3"
            style={{
              background: "var(--tf-surface-raised)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-md)",
              boxShadow: "var(--tf-shadow-lg)",
            }}
          >
            <div>
              <p
                className="label-mono mb-1"
                style={{ color: "var(--tf-danger)" }}
              >
                Excluir coluna
              </p>
              <p
                className="text-[0.8125rem] font-medium"
                style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
              >
                &quot;{coluna.nome}&quot;
              </p>
            </div>
            <p
              className="text-[0.75rem]"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              {cartoes.length > 0
                ? `${cartoes.length} card${cartoes.length > 1 ? "s" : ""} também ${cartoes.length > 1 ? "serão excluídos" : "será excluído"}.`
                : "Esta coluna está vazia."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmExcluir(false)}
                className="flex-1 h-8 text-[0.75rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)]"
                style={{
                  color: "var(--tf-text-secondary)",
                  border: "1px solid var(--tf-border)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setConfirmExcluir(false);
                  onExcluir();
                }}
                className="flex-1 h-8 text-[0.75rem] font-medium text-white transition-colors hover:brightness-110"
                style={{
                  background: "var(--tf-danger)",
                  border: "1px solid var(--tf-danger)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
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
