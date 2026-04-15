"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search,
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
  getArtigosByCategoria,
  getArtigosPopulares,
  buscarArtigos,
} from "@/lib/help-content";
import { HelpLayout } from "@/components/help/help-layout";

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

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const populares = getArtigosPopulares();
  const resultadosBusca = query.trim() ? buscarArtigos(query) : [];

  return (
    <HelpLayout>
      <main className="max-w-5xl mx-auto px-6 md:px-12 py-14 md:py-18">
        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-1.5 h-1.5"
              style={{
                background: "var(--tf-accent)",
                borderRadius: "1px",
              }}
            />
            <p
              className="text-[0.6875rem] font-medium"
              style={{
                color: "var(--tf-accent)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Central de ajuda
            </p>
          </div>
          <h1
            className="text-[2rem] md:text-[2.75rem] font-semibold mb-3 max-w-2xl"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            Como podemos te ajudar?
          </h1>
          <p
            className="text-[0.9375rem] max-w-lg"
            style={{
              color: "var(--tf-text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            Encontre respostas, guias e tutoriais para tirar o máximo do Taskflow.
          </p>

          {/* Busca */}
          <div className="mt-7 max-w-xl relative">
            <Search
              size={14}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--tf-text-tertiary)" }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, tag ou palavra-chave…"
              className="help-search w-full pl-9 pr-3 h-10 text-[0.875rem] outline-none"
              style={{
                color: "var(--tf-text)",
                borderRadius: "var(--tf-radius-xs)",
                letterSpacing: "-0.005em",
              }}
              autoFocus
            />
            <style jsx>{`
              .help-search {
                background: var(--tf-surface);
                border: 1px solid var(--tf-border);
                transition: border-color 0.15s ease;
              }
              .help-search:focus {
                border-color: var(--tf-accent);
              }
            `}</style>
          </div>
        </div>

        {/* Resultados OU categorias */}
        {query.trim() ? (
          <div>
            <p
              className="label-mono mb-3"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              {resultadosBusca.length} resultado{resultadosBusca.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {resultadosBusca.map((artigo) => (
                <Link
                  key={artigo.id}
                  href={`/help/${artigo.id}`}
                  className="block p-3.5 transition-colors no-underline"
                  style={{
                    background: "var(--tf-surface)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--tf-accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--tf-border)")
                  }
                >
                  <p
                    className="text-[0.875rem] font-medium"
                    style={{
                      color: "var(--tf-text)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {artigo.titulo}
                  </p>
                  <p
                    className="text-[0.75rem] mt-1"
                    style={{
                      color: "var(--tf-text-tertiary)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {artigo.descricao}
                  </p>
                </Link>
              ))}
              {resultadosBusca.length === 0 && (
                <p
                  className="text-center py-8 text-[0.75rem]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Nenhum artigo encontrado para &quot;{query}&quot;
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Mais lidos */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles
                  size={12}
                  strokeWidth={1.75}
                  style={{ color: "var(--tf-accent)" }}
                />
                <h2
                  className="label-mono"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  Mais lidos
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {populares.map((artigo) => (
                  <Link
                    key={artigo.id}
                    href={`/help/${artigo.id}`}
                    className="block p-3.5 transition-colors no-underline"
                    style={{
                      background: "var(--tf-surface)",
                      border: "1px solid var(--tf-border)",
                      borderRadius: "var(--tf-radius-xs)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--tf-accent)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--tf-border)")
                    }
                  >
                    <p
                      className="text-[0.875rem] font-medium"
                      style={{
                        color: "var(--tf-text)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {artigo.titulo}
                    </p>
                    <p
                      className="text-[0.75rem] mt-1 line-clamp-1"
                      style={{
                        color: "var(--tf-text-tertiary)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {artigo.descricao}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Categorias */}
            <div>
              <h2
                className="label-mono mb-3"
                style={{ color: "var(--tf-text-secondary)" }}
              >
                Todas as categorias
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CATEGORIAS.map((cat) => {
                  const Icon = ICON_MAP[cat.icone] || HelpCircle;
                  const artigos = getArtigosByCategoria(cat.id);
                  return (
                    <Link
                      key={cat.id}
                      href={`/help/${artigos[0]?.id || ""}`}
                      className="block p-4 transition-colors no-underline group"
                      style={{
                        background: "var(--tf-surface)",
                        border: "1px solid var(--tf-border)",
                        borderRadius: "var(--tf-radius-md)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "var(--tf-accent)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "var(--tf-border)")
                      }
                    >
                      <div className="flex items-start gap-2.5 mb-2.5">
                        <div
                          className="w-8 h-8 flex items-center justify-center shrink-0"
                          style={{
                            background: "transparent",
                            border: "1px solid var(--tf-accent)",
                            color: "var(--tf-accent)",
                            borderRadius: "var(--tf-radius-xs)",
                          }}
                        >
                          <Icon size={14} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[0.875rem] font-medium"
                            style={{
                              color: "var(--tf-text)",
                              letterSpacing: "-0.005em",
                            }}
                          >
                            {cat.nome}
                          </p>
                          <p
                            className="text-[0.625rem] mt-0.5"
                            style={{
                              color: "var(--tf-text-tertiary)",
                              fontFamily: "var(--tf-font-mono)",
                              letterSpacing: "0.02em",
                            }}
                          >
                            {artigos.length}{" "}
                            {artigos.length === 1 ? "artigo" : "artigos"}
                          </p>
                        </div>
                      </div>
                      <p
                        className="text-[0.75rem]"
                        style={{
                          color: "var(--tf-text-secondary)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {cat.descricao}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer CTA */}
        <div
          className="mt-14 p-6 text-center"
          style={{
            background: "var(--tf-bg-secondary)",
            border: "1px dashed var(--tf-border-strong)",
            borderRadius: "var(--tf-radius-md)",
          }}
        >
          <p
            className="label-mono mb-1"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Suporte direto
          </p>
          <h3
            className="text-[1rem] font-semibold mb-1"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.01em",
            }}
          >
            Não achou o que procurava?
          </h3>
          <p
            className="text-[0.8125rem] mb-4"
            style={{
              color: "var(--tf-text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            Entre em contato e a gente ajuda.
          </p>
          <a
            href="mailto:contato@taskflow.app"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[0.8125rem] font-medium text-white no-underline transition-colors hover:brightness-110"
            style={{
              background: "var(--tf-accent)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              letterSpacing: "-0.005em",
            }}
          >
            Entrar em contato
            <ArrowRight size={13} strokeWidth={1.75} />
          </a>
        </div>
      </main>
    </HelpLayout>
  );
}
