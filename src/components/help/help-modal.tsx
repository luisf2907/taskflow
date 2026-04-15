"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, X, ArrowRight, Sparkles, Folder, Calendar, Kanban, GitBranch, Dices, Bot, Upload, Settings, Keyboard, HelpCircle } from "lucide-react";
import { CATEGORIAS, ARTIGOS, getArtigosPopulares, buscarArtigos, getArtigosByCategoria } from "@/lib/help-content";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  Sparkles, Folder, Calendar, Kanban, GitBranch, Dices, Bot, Upload, Settings, Keyboard, HelpCircle,
};

export function HelpModal() {
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const abrir = useCallback(() => {
    setAberto(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
  }, []);

  // Listener global para "?" e custom event
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // "?" abre o modal (a menos que esteja em input/textarea)
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "?" && !isTyping && !aberto) {
        e.preventDefault();
        abrir();
      } else if (e.key === "Escape" && aberto) {
        fechar();
      }
    }
    function handleOpenEvent() { abrir(); }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-help-modal", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-help-modal", handleOpenEvent);
    };
  }, [aberto, abrir, fechar]);

  if (!aberto) return null;

  const populares = getArtigosPopulares();
  const resultados = query.trim() ? buscarArtigos(query) : [];

  return (
    <div
      className="fixed inset-0 z-[150] flex justify-center pt-[12vh] px-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}
    >
      <div
        className="w-full max-w-[640px] h-fit max-h-[80vh] rounded-[var(--tf-radius-lg)] overflow-hidden border flex flex-col"
        style={{
          background: "var(--tf-surface)",
          borderColor: "var(--tf-border)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          animation: "helpModalIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <style>{`
          @keyframes helpModalIn {
            0% { opacity: 0; transform: scale(0.97) translateY(-8px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "var(--tf-border)" }}
        >
          <Search size={18} style={{ color: "var(--tf-text-tertiary)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Como podemos ajudar?"
            className="flex-1 bg-transparent outline-none text-[15px] font-medium"
            style={{ color: "var(--tf-text)" }}
          />
          <button
            onClick={fechar}
            className="p-1 rounded-[6px]"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteudo */}
        <div className="overflow-y-auto p-5" style={{ scrollbarWidth: "thin" }}>
          {query.trim() ? (
            // BUSCA
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--tf-text-tertiary)" }}>
                {resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
              </p>
              {resultados.map((artigo) => (
                <Link
                  key={artigo.id}
                  href={`/help/${artigo.id}`}
                  onClick={fechar}
                  className="block p-3 rounded-[var(--tf-radius-xs)] no-underline transition-colors"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <p className="text-[13px] font-bold" style={{ color: "var(--tf-text)" }}>
                    {artigo.titulo}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--tf-text-tertiary)" }}>
                    {artigo.descricao}
                  </p>
                </Link>
              ))}
              {resultados.length === 0 && (
                <p className="text-center py-6 text-[13px]" style={{ color: "var(--tf-text-tertiary)" }}>
                  Nenhum resultado para &quot;{query}&quot;
                </p>
              )}
            </div>
          ) : (
            <>
              {/* CATEGORIAS */}
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--tf-text-tertiary)" }}>
                Categorias
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {CATEGORIAS.map((cat) => {
                  const Icon = ICON_MAP[cat.icone] || HelpCircle;
                  const artigos = getArtigosByCategoria(cat.id);
                  return (
                    <Link
                      key={cat.id}
                      href={`/help/${artigos[0]?.id || ""}`}
                      onClick={fechar}
                      className="flex flex-col items-center gap-2 p-3 rounded-[var(--tf-radius-xs)] no-underline transition-all"
                      style={{ background: "var(--tf-bg-secondary)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                      <div
                        className="w-10 h-10 rounded-[var(--tf-radius-xs)] flex items-center justify-center"
                        style={{ background: "var(--tf-accent-light)" }}
                      >
                        <Icon size={18} style={{ color: "var(--tf-accent)" }} />
                      </div>
                      <p className="text-[11px] font-bold text-center leading-tight" style={{ color: "var(--tf-text)" }}>
                        {cat.nome}
                      </p>
                    </Link>
                  );
                })}
              </div>

              {/* POPULARES */}
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "var(--tf-text-tertiary)" }}>
                <Sparkles size={11} /> Mais lidos
              </p>
              <div className="space-y-1">
                {populares.slice(0, 5).map((artigo) => (
                  <Link
                    key={artigo.id}
                    href={`/help/${artigo.id}`}
                    onClick={fechar}
                    className="block p-2.5 rounded-[var(--tf-radius-xs)] no-underline transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-bg-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <p className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
                      {artigo.titulo}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t shrink-0"
          style={{ borderColor: "var(--tf-border)" }}
        >
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--tf-text-tertiary)" }}>
            <kbd className="px-1.5 py-0.5 rounded-[4px] font-bold" style={{ background: "var(--tf-bg-secondary)" }}>?</kbd>
            <span>abrir</span>
            <kbd className="px-1.5 py-0.5 rounded-[4px] font-bold ml-2" style={{ background: "var(--tf-bg-secondary)" }}>ESC</kbd>
            <span>fechar</span>
          </div>
          <Link
            href="/help"
            onClick={fechar}
            className="flex items-center gap-1 text-[12px] font-bold no-underline"
            style={{ color: "var(--tf-accent)" }}
          >
            Ver tudo <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
