"use client";

import { getBreadcrumb } from "@/lib/wiki-utils";
import { uploadImagemWiki } from "./image-upload";
import { WikiModeSwitcher, type WikiEditMode } from "./wiki-mode-switcher";
import type { WikiPagina } from "@/types";
import { Check, ChevronRight, ImagePlus, Loader2, SmilePlus, X } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";

interface PageHeaderProps {
  pagina: WikiPagina;
  todasPaginas: WikiPagina[];
  onTituloChange: (novoTitulo: string) => void;
  onIconeChange: (novoIcone: string | null) => void;
  onCapaChange: (novaCapaUrl: string | null) => void;
  onNavegar: (paginaId: string) => void;
  statusSalvamento?: "idle" | "salvando" | "salvo";
  workspaceId: string;
  paginaId: string;
  modoEdicao?: WikiEditMode;
  onModoChange?: (modo: WikiEditMode) => void;
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
  onCapaChange,
  onNavegar,
  statusSalvamento = "idle",
  workspaceId,
  paginaId,
  modoEdicao = "editor",
  onModoChange,
}: PageHeaderProps) {
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [titulo, setTitulo] = useState(pagina.titulo);
  const [emojiPickerAberto, setEmojiPickerAberto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const capaInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCapa, setUploadingCapa] = useState(false);

  // Sync título quando muda de página. set-state-in-effect intencional:
  // sincroniza com prop vinda de fora.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTitulo(pagina.titulo);
    setEditandoTitulo(false);
  }, [pagina.id, pagina.titulo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCapaUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingCapa(true);
      const url = await uploadImagemWiki(file, { workspaceId, paginaId });
      if (url) onCapaChange(url);
      setUploadingCapa(false);
      if (capaInputRef.current) capaInputRef.current.value = "";
    },
    [workspaceId, paginaId, onCapaChange],
  );

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
      {/* Cover image */}
      {pagina.capa_url ? (
        <div className="relative group -mx-8 -mt-10 mb-6 h-[200px] rounded-t-[16px] overflow-hidden">
          <img
            src={pagina.capa_url}
            alt="Capa"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => capaInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium text-white/90 backdrop-blur-sm transition-colors"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <ImagePlus size={12} /> Trocar
            </button>
            <button
              type="button"
              onClick={() => onCapaChange(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium text-white/90 backdrop-blur-sm transition-colors"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              <X size={12} /> Remover
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => capaInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] hover:bg-[var(--tf-surface-hover)] transition-colors"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            {uploadingCapa ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ImagePlus size={12} />
            )}
            Adicionar capa
          </button>
        </div>
      )}
      <input
        ref={capaInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleCapaUpload}
        className="hidden"
      />

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
        className="flex items-center justify-between ml-[52px] mt-1"
      >
      <div
        className="flex items-center gap-3 text-[11px]"
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

        {statusSalvamento !== "idle" && (
          <span className="flex items-center gap-1 transition-opacity duration-300">
            {statusSalvamento === "salvando" ? (
              <>
                <Loader2 size={11} className="animate-spin" style={{ color: "var(--tf-text-tertiary)" }} />
                Salvando...
              </>
            ) : (
              <>
                <Check size={11} style={{ color: "var(--tf-accent)" }} />
                <span style={{ color: "var(--tf-accent)" }}>Salvo</span>
              </>
            )}
          </span>
        )}
      </div>

      {onModoChange && (
        <WikiModeSwitcher modo={modoEdicao} onChange={onModoChange} />
      )}
      </div>
    </div>
  );
}
