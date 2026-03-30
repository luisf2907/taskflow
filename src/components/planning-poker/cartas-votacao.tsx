"use client";

import { cn } from "@/lib/utils";
import { POKER_VALORES } from "@/types";
import { Coffee } from "lucide-react";
import { useCallback, useRef } from "react";

interface CartasVotacaoProps {
  valorSelecionado: string | null;
  onVotar: (valor: string) => void;
  desabilitado?: boolean;
}

const LABELS: Record<string, string> = {
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "5": "5",
  "8": "8",
  "13": "13",
  "21": "21",
  "?": "?",
  "cafe": "",
};

const ARIA_LABELS: Record<string, string> = {
  "0": "0 pontos",
  "1": "1 ponto",
  "2": "2 pontos",
  "3": "3 pontos",
  "5": "5 pontos",
  "8": "8 pontos",
  "13": "13 pontos",
  "21": "21 pontos",
  "?": "Nao sei estimar",
  "cafe": "Pausa para cafe",
};

export function CartasVotacao({ valorSelecionado, onVotar, desabilitado }: CartasVotacaoProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      if (desabilitado) return;
      const valores = POKER_VALORES;
      let nextIdx = idx;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIdx = (idx + 1) % valores.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIdx = (idx - 1 + valores.length) % valores.length;
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onVotar(valores[idx]);
        return;
      } else {
        return;
      }

      const btns = containerRef.current?.querySelectorAll<HTMLButtonElement>("[role=radio]");
      btns?.[nextIdx]?.focus();
    },
    [desabilitado, onVotar]
  );

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Selecione sua estimativa"
      className="flex flex-wrap justify-center gap-2"
    >
      {POKER_VALORES.map((valor, idx) => {
        const selecionado = valorSelecionado === valor;
        return (
          <button
            key={valor}
            role="radio"
            aria-checked={selecionado}
            aria-label={ARIA_LABELS[valor]}
            tabIndex={selecionado || (!valorSelecionado && idx === 0) ? 0 : -1}
            disabled={desabilitado}
            onClick={() => onVotar(valor)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              "relative flex items-center justify-center rounded-[12px] border-2 font-bold transition-all duration-200 cursor-pointer select-none",
              "w-12 h-16 sm:w-14 sm:h-20 text-lg sm:text-xl",
              "hover:scale-105 active:scale-95",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
              selecionado && "ring-2 ring-offset-2 scale-110",
            )}
            style={{
              background: selecionado ? "var(--tf-accent)" : "var(--tf-surface)",
              borderColor: selecionado ? "var(--tf-accent)" : "var(--tf-border)",
              color: selecionado ? "#fff" : "var(--tf-text)",
              // @ts-expect-error CSS custom property
              "--tw-ring-color": "var(--tf-accent)",
              "--tw-ring-offset-color": "var(--tf-surface)",
            }}
          >
            {valor === "cafe" ? (
              <Coffee size={20} />
            ) : (
              LABELS[valor]
            )}
          </button>
        );
      })}
    </div>
  );
}
