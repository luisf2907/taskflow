"use client";

import Link from "next/link";
import { GitMerge, ArrowRight } from "lucide-react";

const columns = [
  {
    title: "A fazer",
    cards: [
      { dot: "var(--tf-danger)", name: "Corrigir bug no login" },
      { dot: "var(--tf-warning)", name: "Criar tela de onboarding" },
    ],
  },
  {
    title: "Em progresso",
    cards: [
      { dot: "var(--tf-accent)", name: "Redesign do dashboard" },
      { dot: "var(--tf-danger)", name: "Integrar API de pagamento" },
    ],
  },
  {
    title: "Concluído",
    cards: [
      { dot: "var(--tf-success)", name: "Setup CI/CD pipeline" },
      { dot: "var(--tf-success)", name: "Documentar endpoints" },
    ],
  },
];

export default function HeroSection() {
  return (
    <section
      className="overflow-hidden relative hero-grid"
      style={{ backgroundColor: "var(--tf-bg)" }}
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-16 px-6 md:px-12 py-20 md:py-28 relative z-10">
        {/* LEFT — text */}
        <div className="flex-1 flex flex-col items-start gap-5">
          {/* Label mono acima do título */}
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 pulse-dot"
              style={{
                background: "var(--tf-accent)",
                borderRadius: "1px",
              }}
            />
            <span
              className="text-[0.6875rem] font-medium"
              style={{
                color: "var(--tf-text-secondary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Para times de desenvolvimento
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-[2.5rem] md:text-[3.5rem] font-semibold tracking-tight leading-[1.05] m-0"
            style={{
              color: "var(--tf-text)",
              letterSpacing: "-0.03em",
            }}
          >
            Gerencie tarefas do jeito que seu time{" "}
            <span style={{ color: "var(--tf-accent)" }}>realmente trabalha.</span>
          </h1>

          {/* Subheading */}
          <p
            className="text-[1rem] md:text-[1.0625rem] leading-relaxed max-w-lg m-0"
            style={{
              color: "var(--tf-text-secondary)",
              letterSpacing: "-0.005em",
            }}
          >
            Kanban boards, sprints, integração com GitHub — tudo num só lugar
            para times que querem entregar mais.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-2 mt-2">
            <Link
              href="/login"
              className="no-underline inline-flex items-center gap-1.5 h-11 px-5 text-[0.875rem] font-medium transition-colors hover:brightness-110"
              style={{
                backgroundColor: "var(--tf-accent)",
                color: "#FFFFFF",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-xs)",
                letterSpacing: "-0.005em",
              }}
            >
              Começar grátis
              <ArrowRight size={14} strokeWidth={1.75} />
            </Link>
            <a
              href="#how-it-works"
              className="no-underline inline-flex items-center h-11 px-5 text-[0.875rem] font-medium transition-colors hover:border-[var(--tf-accent)] hover:text-[var(--tf-accent)]"
              style={{
                border: "1px solid var(--tf-border-strong)",
                color: "var(--tf-text)",
                borderRadius: "var(--tf-radius-xs)",
                backgroundColor: "transparent",
                letterSpacing: "-0.005em",
              }}
            >
              Como funciona
            </a>
          </div>

          {/* Tech credibility tags */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {["Open source", "Self-hostable", "GitHub ready"].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center h-6 px-2 text-[0.625rem] font-medium"
                style={{
                  background: "var(--tf-bg-secondary)",
                  color: "var(--tf-text-secondary)",
                  border: "1px solid var(--tf-border)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT — mockup */}
        <div className="flex-1 w-full relative">
          {/* Kanban board mockup */}
          <div
            className="p-4"
            style={{
              borderRadius: "var(--tf-radius-md)",
              backgroundColor: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
              boxShadow: "var(--tf-shadow-lg)",
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 mb-3 pb-3" style={{ borderBottom: "1px solid var(--tf-border)" }}>
              <span className="w-2 h-2" style={{ background: "var(--tf-danger)", borderRadius: "1px" }} />
              <span className="w-2 h-2" style={{ background: "var(--tf-warning)", borderRadius: "1px" }} />
              <span className="w-2 h-2" style={{ background: "var(--tf-success)", borderRadius: "1px" }} />
              <span
                className="ml-2 text-[0.625rem]"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.02em",
                }}
              >
                sprint / 2025-04
              </span>
            </div>

            <div className="flex gap-2.5">
              {columns.map((col) => (
                <div key={col.title} className="flex-1 flex flex-col gap-1.5">
                  {/* Column header */}
                  <span
                    className="label-mono px-1 pb-1"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {col.title}
                  </span>

                  {/* Cards */}
                  {col.cards.map((card) => (
                    <div
                      key={card.name}
                      className="flex items-center gap-2 p-2.5 relative overflow-hidden"
                      style={{
                        borderRadius: "var(--tf-radius-xs)",
                        backgroundColor: "var(--tf-surface)",
                        border: "1px solid var(--tf-border)",
                      }}
                    >
                      {/* Barra lateral colorida */}
                      <span
                        className="absolute left-0 top-0 bottom-0 w-[2px]"
                        style={{ backgroundColor: card.dot }}
                      />
                      <span
                        className="text-[0.6875rem] font-medium truncate pl-1"
                        style={{
                          color: "var(--tf-text)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {card.name}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Floating badge — PRs merged */}
          <div
            className="absolute hidden sm:flex items-center gap-1.5 h-8 px-2.5"
            style={{
              top: -10,
              right: -8,
              backgroundColor: "var(--tf-surface)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              boxShadow: "var(--tf-shadow-lg)",
            }}
          >
            <GitMerge size={12} strokeWidth={1.75} style={{ color: "var(--tf-accent)" }} />
            <span
              className="text-[0.6875rem] font-medium"
              style={{
                color: "var(--tf-text)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
              }}
            >
              3 PRs merged
            </span>
          </div>

          {/* Floating badge — Sprint progress */}
          <div
            className="absolute hidden sm:flex items-center h-8 px-2.5"
            style={{
              bottom: -8,
              left: -8,
              backgroundColor: "var(--tf-accent)",
              color: "#FFFFFF",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              boxShadow: "var(--tf-shadow-lg)",
            }}
          >
            <span
              className="text-[0.6875rem] font-medium"
              style={{
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Sprint · 97%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
