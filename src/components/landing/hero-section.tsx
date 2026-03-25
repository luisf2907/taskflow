"use client";

import Link from "next/link";
import { GitMerge } from "lucide-react";

const columns = [
  {
    title: "A fazer",
    cards: [
      { dot: "#D84D4D", name: "Corrigir bug no login" },
      { dot: "#FBD051", name: "Criar tela de onboarding" },
    ],
  },
  {
    title: "Em progresso",
    cards: [
      { dot: "#FBD051", name: "Redesign do dashboard" },
      { dot: "#D84D4D", name: "Integrar API de pagamento" },
    ],
  },
  {
    title: "Concluido",
    cards: [
      { dot: "#2E8B57", name: "Setup CI/CD pipeline" },
      { dot: "#2E8B57", name: "Documentar endpoints" },
    ],
  },
];

export default function HeroSection() {
  return (
    <section
      className="overflow-hidden"
      style={{ backgroundColor: "var(--tf-bg)" }}
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20 px-6 md:px-12 py-20 md:py-32">
        {/* LEFT — text */}
        <div className="flex-1 flex flex-col items-start gap-6">
          {/* Badge */}
          <span
            className="inline-block rounded-full text-[13px] font-bold px-4 py-1.5"
            style={{
              backgroundColor: "var(--tf-accent-light)",
              color: "var(--tf-accent-text)",
            }}
          >
            Feito para times de desenvolvimento
          </span>

          {/* Heading */}
          <h1
            className="text-[32px] md:text-[48px] font-black tracking-tight leading-[1.1] m-0"
            style={{ color: "var(--tf-text)" }}
          >
            Gerencie tarefas do jeito que seu time realmente trabalha
          </h1>

          {/* Subheading */}
          <p
            className="text-[18px] leading-relaxed max-w-lg m-0"
            style={{ color: "var(--tf-text-secondary)" }}
          >
            Kanban boards, sprints, integracao com GitHub — tudo num so lugar
            para times que querem entregar mais.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mt-2">
            <Link
              href="/login"
              className="no-underline text-[15px] font-bold px-8 py-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                backgroundColor: "var(--tf-accent)",
                color: "#FFFFFF",
                borderRadius: "20px",
              }}
            >
              Comece Grátis
            </Link>
            <a
              href="#how-it-works"
              className="no-underline text-[15px] font-bold px-8 py-4 transition-all hover:border-[var(--tf-accent)]"
              style={{
                border: "2px solid var(--tf-border)",
                color: "var(--tf-text)",
                borderRadius: "20px",
                backgroundColor: "transparent",
              }}
            >
              Veja Como Funciona
            </a>
          </div>

          {/* Tech credibility */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {["Open Source", "Self-hostable", "GitHub Ready"].map((tag) => (
              <span
                key={tag}
                className="text-[12px] font-bold px-3 py-1.5 rounded-full"
                style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-secondary)" }}
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
            className="landing-float p-4"
            style={{
              borderRadius: "32px",
              backgroundColor: "var(--tf-surface)",
              border: "1px solid var(--tf-border)",
              boxShadow: "var(--tf-shadow-md)",
            }}
          >
            <div className="flex gap-3">
              {columns.map((col) => (
                <div key={col.title} className="flex-1 flex flex-col gap-2">
                  {/* Column header */}
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest px-1 pb-1"
                    style={{ color: "var(--tf-text-tertiary)" }}
                  >
                    {col.title}
                  </span>

                  {/* Cards */}
                  {col.cards.map((card) => (
                    <div
                      key={card.name}
                      className="flex items-center gap-2 p-3"
                      style={{
                        borderRadius: "14px",
                        backgroundColor: "var(--tf-bg)",
                        border: "1px solid var(--tf-border-subtle)",
                      }}
                    >
                      <span
                        className="shrink-0"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: card.dot,
                        }}
                      />
                      <span
                        className="text-[12px] font-bold truncate"
                        style={{ color: "var(--tf-text)" }}
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
            className="landing-float-delay absolute hidden sm:flex items-center gap-2 px-3 py-2"
            style={{
              top: -12,
              right: -8,
              backgroundColor: "var(--tf-surface)",
              boxShadow: "var(--tf-shadow-md)",
              borderRadius: "14px",
              border: "1px solid var(--tf-border)",
            }}
          >
            <GitMerge size={14} style={{ color: "var(--tf-accent)" }} />
            <span
              className="text-[12px] font-bold"
              style={{ color: "var(--tf-text)" }}
            >
              3 PRs merged
            </span>
          </div>

          {/* Floating badge — Sprint progress */}
          <div
            className="landing-float-delay absolute hidden sm:flex items-center px-3 py-2"
            style={{
              bottom: -8,
              left: -8,
              backgroundColor: "var(--tf-accent-yellow)",
              color: "#1C2B29",
              borderRadius: "14px",
              boxShadow: "var(--tf-shadow-md)",
            }}
          >
            <span className="text-[12px] font-bold">Sprint 97%</span>
          </div>
        </div>
      </div>
    </section>
  );
}
