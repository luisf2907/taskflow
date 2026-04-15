"use client";

import { Info, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import type { HelpBlock } from "@/lib/help-content";

const ALERTAS_CONFIG = {
  info: { icon: Info, bg: "var(--tf-accent-light)", color: "var(--tf-accent)", border: "var(--tf-accent)" },
  warning: { icon: AlertTriangle, bg: "var(--tf-warning-bg)", color: "var(--tf-warning)", border: "var(--tf-warning)" },
  success: { icon: CheckCircle, bg: "var(--tf-success-bg)", color: "var(--tf-success)", border: "var(--tf-success)" },
  tip: { icon: Lightbulb, bg: "var(--tf-accent-light)", color: "var(--tf-accent)", border: "var(--tf-accent)" },
};

export function HelpRenderer({ blocos }: { blocos: HelpBlock[] }) {
  return (
    <div className="space-y-5">
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
      const className = nivel === 2
        ? "text-[18px] font-bold mt-6 mb-2"
        : "text-[15px] font-bold mt-4 mb-2";
      return (
        <h2 className={className} style={{ color: "var(--tf-text)" }}>
          {bloco.conteudo as string}
        </h2>
      );
    }

    case "paragrafo":
      return (
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--tf-text-secondary)" }}>
          {bloco.conteudo as string}
        </p>
      );

    case "lista":
      return (
        <ul className="space-y-1.5 list-disc pl-5">
          {(bloco.conteudo as string[]).map((item, i) => (
            <li key={i} className="text-[14px] leading-relaxed" style={{ color: "var(--tf-text-secondary)" }}>
              {item}
            </li>
          ))}
        </ul>
      );

    case "passos":
      return (
        <ol className="space-y-2.5">
          {(bloco.conteudo as string[]).map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                style={{ background: "var(--tf-accent)", color: "#fff" }}
              >
                {i + 1}
              </span>
              <span className="text-[14px] leading-relaxed pt-0.5" style={{ color: "var(--tf-text-secondary)" }}>
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
          className="flex items-start gap-3 p-4 rounded-[var(--tf-radius-sm)] border-l-4"
          style={{ background: config.bg, borderColor: config.border }}
        >
          <Icon size={18} style={{ color: config.color }} className="shrink-0 mt-0.5" />
          <p className="text-[13px] leading-relaxed font-medium" style={{ color: config.color }}>
            {bloco.conteudo as string}
          </p>
        </div>
      );
    }

    case "codigo":
      return (
        <pre
          className="p-4 rounded-[var(--tf-radius-sm)] overflow-x-auto text-[12px] font-mono"
          style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text)" }}
        >
          <code>{bloco.conteudo as string}</code>
        </pre>
      );

    default:
      return null;
  }
}
