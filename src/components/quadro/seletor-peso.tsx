"use client";

import { cn } from "@/lib/utils";

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

interface SeletorPesoProps {
  valor: number | null;
  onChange: (peso: number | null) => void;
}

export function SeletorPeso({ valor, onChange }: SeletorPesoProps) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
        Story Points
      </p>
      <div className="flex flex-wrap gap-1.5">
        {FIBONACCI.map((n) => (
          <button
            key={n}
            onClick={() => onChange(valor === n ? null : n)}
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
      </div>
    </div>
  );
}
