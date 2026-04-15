"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  X,
  ArrowRight,
  Sparkles,
  Folder,
  Calendar,
  Kanban,
  GitBranch,
  Dices,
  Bot,
  Upload,
  Settings,
  Keyboard,
  HelpCircle,
} from "lucide-react";
import {
  CATEGORIAS,
  getArtigosPopulares,
  buscarArtigos,
  getArtigosByCategoria,
} from "@/lib/help-content";
import { fadeOnly, scaleIn } from "@/lib/motion/presets";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
> = {
  Sparkles,
  Folder,
  Calendar,
  Kanban,
  GitBranch,
  Dices,
  Bot,
  Upload,
  Settings,
  Keyboard,
  HelpCircle,
};

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center h-[18px] px-1.5 text-[0.625rem]"
      style={{
        background: "var(--tf-bg-secondary)",
        color: "var(--tf-text-secondary)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-xs)",
        fontFamily: "var(--tf-font-mono)",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </kbd>
  );
}

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (e.key === "?" && !isTyping && !aberto) {
        e.preventDefault();
        abrir();
      } else if (e.key === "Escape" && aberto) {
        fechar();
      }
    }
    function handleOpenEvent() {
      abrir();
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-help-modal", handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-help-modal", handleOpenEvent);
    };
  }, [aberto, abrir, fechar]);

  const populares = getArtigosPopulares();
  const resultados = query.trim() ? buscarArtigos(query) : [];

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeOnly}
          className="fixed inset-0 z-[150] flex justify-center pt-[12vh] px-4"
          style={{
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={scaleIn}
            className="w-full max-w-[640px] h-fit max-h-[80vh] overflow-hidden flex flex-col"
            style={{
              background: "var(--tf-surface-raised)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-lg)",
              boxShadow: "var(--tf-shadow-lg)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2.5 px-4 h-11 shrink-0"
              style={{ borderBottom: "1px solid var(--tf-border)" }}
            >
              <Search
                size={14}
                strokeWidth={1.75}
                style={{ color: "var(--tf-text-tertiary)" }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Como podemos ajudar?"
                className="flex-1 bg-transparent outline-none text-[0.875rem]"
                style={{
                  color: "var(--tf-text)",
                  letterSpacing: "-0.005em",
                }}
              />
              <button
                onClick={fechar}
                className="p-1 transition-colors hover:bg-[var(--tf-surface-hover)]"
                style={{
                  color: "var(--tf-text-tertiary)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
                aria-label="Fechar"
              >
                <X size={13} strokeWidth={1.75} />
              </button>
            </div>

            {/* Conteudo */}
            <div
              className="overflow-y-auto p-4"
              style={{ scrollbarWidth: "thin" }}
            >
              {query.trim() ? (
                <div className="space-y-1">
                  <p
                    className="label-mono mb-2"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {resultados.length} resultado
                    {resultados.length !== 1 ? "s" : ""}
                  </p>
                  {resultados.map((artigo) => (
                    <Link
                      key={artigo.id}
                      href={`/help/${artigo.id}`}
                      onClick={fechar}
                      className="block p-2.5 no-underline transition-colors"
                      style={{
                        background: "transparent",
                        borderRadius: "var(--tf-radius-xs)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--tf-surface-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <p
                        className="text-[0.8125rem] font-medium"
                        style={{
                          color: "var(--tf-text)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {artigo.titulo}
                      </p>
                      <p
                        className="text-[0.6875rem] mt-0.5"
                        style={{
                          color: "var(--tf-text-tertiary)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {artigo.descricao}
                      </p>
                    </Link>
                  ))}
                  {resultados.length === 0 && (
                    <p
                      className="text-center py-6 text-[0.75rem]"
                      style={{
                        color: "var(--tf-text-tertiary)",
                        fontFamily: "var(--tf-font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      Nenhum resultado para &quot;{query}&quot;
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* CATEGORIAS */}
                  <p
                    className="label-mono mb-2.5"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    Categorias
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-5">
                    {CATEGORIAS.map((cat) => {
                      const Icon = ICON_MAP[cat.icone] || HelpCircle;
                      const artigos = getArtigosByCategoria(cat.id);
                      return (
                        <Link
                          key={cat.id}
                          href={`/help/${artigos[0]?.id || ""}`}
                          onClick={fechar}
                          className="flex flex-col items-center gap-2 p-2.5 no-underline transition-colors"
                          style={{
                            background: "var(--tf-bg-secondary)",
                            border: "1px solid var(--tf-border)",
                            borderRadius: "var(--tf-radius-xs)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor =
                              "var(--tf-accent)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.borderColor =
                              "var(--tf-border)")
                          }
                        >
                          <div
                            className="w-8 h-8 flex items-center justify-center"
                            style={{
                              background: "transparent",
                              border: "1px solid var(--tf-accent)",
                              color: "var(--tf-accent)",
                              borderRadius: "var(--tf-radius-xs)",
                            }}
                          >
                            <Icon size={14} strokeWidth={1.75} />
                          </div>
                          <p
                            className="text-[0.6875rem] font-medium text-center leading-tight"
                            style={{
                              color: "var(--tf-text)",
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {cat.nome}
                          </p>
                        </Link>
                      );
                    })}
                  </div>

                  {/* POPULARES */}
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles
                      size={11}
                      strokeWidth={1.75}
                      style={{ color: "var(--tf-accent)" }}
                    />
                    <p
                      className="label-mono"
                      style={{ color: "var(--tf-text-tertiary)" }}
                    >
                      Mais lidos
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {populares.slice(0, 5).map((artigo) => (
                      <Link
                        key={artigo.id}
                        href={`/help/${artigo.id}`}
                        onClick={fechar}
                        className="block p-2 no-underline transition-colors"
                        style={{
                          borderRadius: "var(--tf-radius-xs)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "var(--tf-surface-hover)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <p
                          className="text-[0.8125rem] font-medium"
                          style={{
                            color: "var(--tf-text)",
                            letterSpacing: "-0.005em",
                          }}
                        >
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
              className="flex items-center justify-between px-4 h-10 shrink-0"
              style={{ borderTop: "1px solid var(--tf-border)" }}
            >
              <div className="flex items-center gap-2">
                <Kbd>?</Kbd>
                <span
                  className="text-[0.6875rem]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  abrir
                </span>
                <Kbd>ESC</Kbd>
                <span
                  className="text-[0.6875rem]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  fechar
                </span>
              </div>
              <Link
                href="/help"
                onClick={fechar}
                className="inline-flex items-center gap-1 text-[0.6875rem] font-medium no-underline transition-colors hover:brightness-110"
                style={{
                  color: "var(--tf-accent)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Ver tudo <ArrowRight size={11} strokeWidth={1.75} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
