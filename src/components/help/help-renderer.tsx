"use client";

import { Info, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import type { HelpBlock } from "@/lib/help-content";

const ALERTAS_CONFIG = {
  info: {
    icon: Info,
    bg: "var(--tf-accent-light)",
    color: "var(--tf-accent-text)",
    border: "var(--tf-accent)",
  },
  warning: {
    icon: AlertTriangle,
    bg: "var(--tf-warning-bg)",
    color: "var(--tf-warning)",
    border: "var(--tf-warning)",
  },
  success: {
    icon: CheckCircle,
    bg: "var(--tf-success-bg)",
    color: "var(--tf-success)",
    border: "var(--tf-success)",
  },
  tip: {
    icon: Lightbulb,
    bg: "var(--tf-accent-light)",
    color: "var(--tf-accent-text)",
    border: "var(--tf-accent)",
  },
};

export function HelpRenderer({ blocos }: { blocos: HelpBlock[] }) {
  return (
    <div className="space-y-4">
      {blocos.map((bloco, i) => (
        <BlocoRenderer key={i} bloco={bloco} />
      ))}
    </div>
  );
}

function BlocoRenderer({ bloco }: { bloco: HelpBlock }) {
  switch (bloco.tipo) {
    case "titulo": {
      const nivel = bloco.nivel || 2;
      const className =
        nivel === 2
          ? "text-[1.125rem] font-semibold mt-5 mb-2"
          : "text-[0.9375rem] font-semibold mt-4 mb-2";
      return (
        <h2
          className={className}
          style={{
            color: "var(--tf-text)",
            letterSpacing: "-0.015em",
          }}
        >
          {bloco.conteudo as string}
        </h2>
      );
    }

    case "paragrafo":
      return (
        <p
          className="text-[0.875rem] leading-relaxed"
          style={{
            color: "var(--tf-text-secondary)",
            letterSpacing: "-0.005em",
          }}
        >
          {bloco.conteudo as string}
        </p>
      );

    case "lista":
      return (
        <ul className="space-y-1.5 list-disc pl-5">
          {(bloco.conteudo as string[]).map((item, i) => (
            <li
              key={i}
              className="text-[0.875rem] leading-relaxed"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      );

    case "passos":
      return (
        <ol className="space-y-2">
          {(bloco.conteudo as string[]).map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="w-6 h-6 flex items-center justify-center text-[0.6875rem] font-semibold shrink-0 mt-0.5"
                style={{
                  background: "var(--tf-accent-light)",
                  color: "var(--tf-accent-text)",
                  border: "1px solid var(--tf-accent)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="text-[0.875rem] leading-relaxed pt-0.5"
                style={{
                  color: "var(--tf-text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                {item}
              </span>
            </li>
          ))}
        </ol>
      );

    case "alerta": {
      const variante = bloco.variante || "info";
      const config = ALERTAS_CONFIG[variante];
      const Icon = config.icon;
      return (
        <div
          className="flex items-start gap-2.5 p-3.5"
          style={{
            background: config.bg,
            border: `1px solid ${config.border}`,
            borderLeft: `3px solid ${config.border}`,
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Icon
            size={14}
            strokeWidth={1.75}
            style={{ color: config.color }}
            className="shrink-0 mt-0.5"
          />
          <p
            className="text-[0.8125rem] leading-relaxed font-medium"
            style={{
              color: config.color,
              letterSpacing: "-0.005em",
            }}
          >
            {bloco.conteudo as string}
          </p>
        </div>
      );
    }

    case "codigo":
      return (
        <pre
          className="p-3.5 overflow-x-auto text-[0.75rem]"
          style={{
            background: "var(--tf-bg-secondary)",
            color: "var(--tf-text)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            lineHeight: 1.6,
          }}
        >
          <code>{bloco.conteudo as string}</code>
        </pre>
      );

    default:
      return null;
  }
}
