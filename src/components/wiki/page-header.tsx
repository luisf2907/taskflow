"use client";

import { getBreadcrumb } from "@/lib/wiki-utils";
import type { WikiPagina } from "@/types";
import { ChevronRight, FileText, ImagePlus, SmilePlus } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";

interface PageHeaderProps {
  pagina: WikiPagina;
  todasPaginas: WikiPagina[];
  onTituloChange: (novoTitulo: string) => void;
  onIconeChange: (novoIcone: string | null) => void;
  onCapaChange?: (novaCapaUrl: string | null) => void;
  onNavegar: (paginaId: string) => void;
}

// Emojis comuns para seleção rápida
const EMOJIS_RAPIDOS = [
  "📄", "📝", "📋", "📌", "📎", "📁", "📂", "📚",
  "💡", "🎯", "🚀", "⚡", "🔧", "🛠️", "🏗️", "🎨",
  "✅", "❌", "⭐", "🔥", "💎", "🧪", "📊", "📈",
  "🏠", "👥", "🔒", "🌐", "📱", "💻", "🗂️", "🗃️",
];

export function PageHeader({
  pagina,
  todasPaginas,
  onTituloChange,
  onIconeChange,
  onNavegar,
}: PageHeaderProps) {
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [titulo, setTitulo] = useState(pagina.titulo);
  const [emojiPickerAberto, setEmojiPickerAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync título quando muda de página
  useEffect(() => {
    setTitulo(pagina.titulo);
    setEditandoTitulo(false);
  }, [pagina.id, pagina.titulo]);

  const breadcrumb = getBreadcrumb(todasPaginas, pagina.id);

  const handleTituloSubmit = useCallback(() => {
    const novo = titulo.trim();
    if (novo && novo !== pagina.titulo) {
      onTituloChange(novo);
    } else {
      setTitulo(pagina.titulo);
    }
    setEditandoTitulo(false);
  }, [titulo, pagina.titulo, onTituloChange]);

  return (
    <div className="pb-2 mb-4">
      {/* Breadcrumb */}
      {breadcrumb.length > 1 && (
        <nav className="flex items-center gap-1 mb-3 flex-wrap">
          {breadcrumb.map((item, i) => (
            <span key={item.id} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  size={12}
                  style={{ color: "var(--tf-text-tertiary)" }}
                />
              )}
              {i < breadcrumb.length - 1 ? (
                <button
                  type="button"
                  onClick={() => onNavegar(item.id)}
                  className="text-[12px] rounded-[4px] px-1 py-0.5 hover:bg-[var(--tf-surface-hover)] transition-colors"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  {item.icone || ""} {item.titulo}
                </button>
              ) : (
                <span
                  className="text-[12px] px-1 py-0.5"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  {item.icone || ""} {item.titulo}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Ícone + Título */}
      <div className="flex items-start gap-3 mb-1">
        {/* Ícone */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setEmojiPickerAberto(!emojiPickerAberto)}
            className="w-10 h-10 flex items-center justify-center rounded-[10px] text-2xl hover:bg-[var(--tf-surface-hover)] transition-colors shrink-0 mt-1"
            title="Alterar ícone"
          >
            {pagina.icone || (
              <SmilePlus
                size={22}
                strokeWidth={1.5}
                style={{ color: "var(--tf-text-tertiary)" }}
              />
            )}
          </button>

          {emojiPickerAberto && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setEmojiPickerAberto(false)}
              />
              <div
                className="absolute left-0 top-full mt-1 z-50 rounded-[12px] p-3 w-[260px]"
                style={{
                  background: "var(--tf-surface)",
                  border: "1px solid var(--tf-border)",
                  boxShadow: "var(--tf-shadow-lg)",
                }}
              >
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS_RAPIDOS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onIconeChange(emoji);
                        setEmojiPickerAberto(false);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[var(--tf-surface-hover)] text-[16px] transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {pagina.icone && (
                  <button
                    type="button"
                    onClick={() => {
                      onIconeChange(null);
                      setEmojiPickerAberto(false);
                    }}
                    className="w-full mt-2 py-1.5 text-[12px] rounded-[6px] hover:bg-[var(--tf-surface-hover)]"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Remover ícone
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Título editável */}
        {editandoTitulo ? (
          <input
            ref={inputRef}
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={handleTituloSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTituloSubmit();
              if (e.key === "Escape") {
                setTitulo(pagina.titulo);
                setEditandoTitulo(false);
              }
            }}
            autoFocus
            className="flex-1 text-[28px] font-bold leading-tight outline-none py-1"
            style={{
              color: "var(--tf-text)",
              background: "transparent",
              borderBottom: "2px solid var(--tf-accent)",
            }}
          />
        ) : (
          <h1
            onClick={() => {
              setTitulo(pagina.titulo);
              setEditandoTitulo(true);
            }}
            className="flex-1 text-[28px] font-bold leading-tight cursor-text py-1 hover:bg-[var(--tf-surface-hover)] rounded-[6px] px-1 -mx-1 transition-colors"
            style={{ color: "var(--tf-text)" }}
          >
            {pagina.titulo}
          </h1>
        )}
      </div>

      {/* Meta info */}
      <div
        className="flex items-center gap-3 text-[11px] ml-[52px] mt-1"
        style={{ color: "var(--tf-text-tertiary)" }}
      >
        <span>
          Atualizado em{" "}
          {new Date(pagina.atualizado_em).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
