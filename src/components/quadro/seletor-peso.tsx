"use client";

import { useState } from "react";

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

interface SeletorPesoProps {
  valor: number | null;
  onChange: (peso: number | null) => void;
}

export function SeletorPeso({ valor, onChange }: SeletorPesoProps) {
  const [customAberto, setCustomAberto] = useState(false);
  const [customValor, setCustomValor] = useState("");

  const isFibonacci = valor !== null && FIBONACCI.includes(valor);
  const isCustom = valor !== null && !isFibonacci;

  function handleCustomSubmit() {
    const n = parseInt(customValor, 10);
    if (!isNaN(n) && n > 0 && n <= 999) {
      onChange(n);
      setCustomAberto(false);
      setCustomValor("");
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
        Story Points
      </p>

      <div className="flex flex-wrap gap-1">
        {FIBONACCI.map((n) => {
          const ativo = valor === n;
          return (
            <button
              key={n}
              onClick={() => {
                onChange(valor === n ? null : n);
                setCustomAberto(false);
              }}
              className="w-8 h-8 text-[0.8125rem] font-medium transition-colors"
              style={{
                background: ativo ? "var(--tf-accent)" : "var(--tf-surface)",
                color: ativo ? "#FFFFFF" : "var(--tf-text)",
                border: `1px solid ${ativo ? "var(--tf-accent)" : "var(--tf-border)"}`,
                borderRadius: "var(--tf-radius-xs)",
                fontFamily: "var(--tf-font-mono)",
              }}
              onMouseEnter={(e) => {
                if (!ativo) e.currentTarget.style.borderColor = "var(--tf-accent)";
              }}
              onMouseLeave={(e) => {
                if (!ativo) e.currentTarget.style.borderColor = "var(--tf-border)";
              }}
            >
              {n}
            </button>
          );
        })}

        {/* Botão custom */}
        {!customAberto ? (
          <button
            onClick={() => setCustomAberto(true)}
            className="h-8 px-2.5 text-[0.75rem] font-medium transition-colors"
            style={{
              background: isCustom ? "var(--tf-accent)" : "transparent",
              color: isCustom ? "#FFFFFF" : "var(--tf-text-tertiary)",
              border: `1px dashed ${isCustom ? "var(--tf-accent)" : "var(--tf-border-strong)"}`,
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
            }}
          >
            {isCustom ? valor : "…"}
          </button>
        ) : (
          <input
            type="number"
            min={1}
            max={999}
            value={customValor}
            onChange={(e) => setCustomValor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomSubmit();
              if (e.key === "Escape") {
                setCustomAberto(false);
                setCustomValor("");
              }
            }}
            placeholder="pts"
            className="w-14 h-8 px-2 text-[0.8125rem] font-medium text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-accent)",
              borderRadius: "var(--tf-radius-xs)",
              color: "var(--tf-text)",
              fontFamily: "var(--tf-font-mono)",
            }}
            autoFocus
          />
        )}
      </div>

      {/* Limpar */}
      {valor !== null && (
        <button
          onClick={() => {
            onChange(null);
            setCustomAberto(false);
            setCustomValor("");
          }}
          className="text-[0.6875rem] font-medium transition-colors hover:text-[var(--tf-danger)]"
          style={{
            color: "var(--tf-text-tertiary)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Limpar pontos
        </button>
      )}
    </div>
  );
}
