"use client";

import Link from "next/link";
import { Sparkles, Zap } from "lucide-react";
import { features } from "@/lib/features";
import type { Perfil } from "@/types";

interface PlanoSectionProps {
  perfil: Perfil | null;
}

/** O que o PRO destrava hoje. Mesma lista do aviso em components/pro. */
const RECURSOS_IA = [
  "Perguntar à IA sobre o workspace",
  "Gerar cards a partir de uma descrição",
  "Melhorar card com descrição, checklist e triagem",
  "Resumo automático de reuniões",
];

export function PlanoSection({ perfil }: PlanoSectionProps) {
  // Sem driver de LLM configurado, PRO nao destrava nada — nao faz sentido
  // anunciar plano nesta instancia.
  if (!features.ai) return null;

  const ehPro = perfil?.plano === "pro";

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={14} style={{ color: "var(--tf-accent)" }} />
        <h2 className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
          Plano
        </h2>
      </div>

      <div
        className="rounded-[var(--tf-radius-md)] p-6 space-y-4"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: ehPro ? "var(--tf-accent)" : "var(--tf-surface)",
              border: ehPro ? "none" : "1px solid var(--tf-border)",
            }}
          >
            <Sparkles
              size={15}
              style={{ color: ehPro ? "#fff" : "var(--tf-text-tertiary)" }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p
                className="text-[13px] font-semibold"
                style={{ color: "var(--tf-text)" }}
              >
                {ehPro ? "TaskFlow PRO" : "Plano gratuito"}
              </p>
              {ehPro && (
                <span
                  className="inline-flex items-center px-1.5 h-[17px] text-[10px] font-bold shrink-0"
                  style={{
                    background: "var(--tf-accent-light)",
                    color: "var(--tf-accent-text)",
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.04em",
                  }}
                >
                  PRO
                </span>
              )}
            </div>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              {ehPro
                ? "Você tem acesso à IA do TaskFlow."
                : "A IA do TaskFlow faz parte do plano PRO."}
            </p>
          </div>
        </div>

        <ul className="space-y-1.5">
          {RECURSOS_IA.map((r) => (
            <li
              key={r}
              className="flex items-center gap-2 text-[12px]"
              style={{
                color: ehPro ? "var(--tf-text)" : "var(--tf-text-tertiary)",
              }}
            >
              <Sparkles
                size={11}
                aria-hidden="true"
                style={{
                  color: ehPro
                    ? "var(--tf-accent-text)"
                    : "var(--tf-text-tertiary)",
                }}
              />
              {r}
            </li>
          ))}
        </ul>

        {!ehPro && (
          <Link
            href="/pricing"
            className="inline-flex items-center px-4 py-2 text-[13px] font-bold text-white rounded-[var(--tf-radius-xs)]"
            style={{ background: "var(--tf-accent)" }}
          >
            Ver planos
          </Link>
        )}
      </div>
    </section>
  );
}
