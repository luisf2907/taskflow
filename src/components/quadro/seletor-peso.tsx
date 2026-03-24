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
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
        Story Points
      </p>

      <div className="flex flex-wrap gap-1.5">
        {FIBONACCI.map((n) => (
          <button
            key={n}
            onClick={() => { onChange(valor === n ? null : n); setCustomAberto(false); }}
            className="w-9 h-9 rounded-[8px] text-[13px] font-bold"
            style={{
              background: valor === n ? "var(--tf-accent)" : "var(--tf-surface)",
              color: valor === n ? "#fff" : "var(--tf-text)",
              border: valor === n ? "none" : "1px solid var(--tf-border)",
              transition: "all 0.15s ease",
            }}
          >
            {n}
          </button>
        ))}

        {/* Botão custom */}
        {!customAberto ? (
          <button
            onClick={() => setCustomAberto(true)}
            className="h-9 px-3 rounded-[8px] text-[12px] font-semibold"
            style={{
              background: isCustom ? "var(--tf-accent)" : "var(--tf-surface)",
              color: isCustom ? "#fff" : "var(--tf-text-tertiary)",
              border: isCustom ? "none" : "1px dashed var(--tf-border)",
              transition: "all 0.15s ease",
            }}
          >
            {isCustom ? valor : "..."}
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={999}
              value={customValor}
              onChange={(e) => setCustomValor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCustomSubmit();
                if (e.key === "Escape") { setCustomAberto(false); setCustomValor(""); }
              }}
              placeholder="pts"
              className="w-14 h-9 px-2 rounded-[8px] text-[13px] font-bold text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{
                background: "var(--tf-bg-secondary)",
                border: "2px solid var(--tf-accent)",
                color: "var(--tf-text)",
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Limpar */}
      {valor !== null && (
        <button
          onClick={() => { onChange(null); setCustomAberto(false); setCustomValor(""); }}
          className="text-[11px] font-medium hover:underline underline-offset-2"
          style={{ color: "var(--tf-text-tertiary)", transition: "color 0.15s ease" }}
        >
          Limpar pontos
        </button>
      )}
    </div>
  );
}
