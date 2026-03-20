"use client";

import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

interface SeletorPesoProps {
  valor: number | null;
  onChange: (peso: number | null) => void;
}

export function SeletorPeso({ valor, onChange }: SeletorPesoProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-[var(--trello-text-subtle)] uppercase tracking-wide flex items-center gap-1.5">
        <Gauge size={12} />
        Story Points
      </p>
      <div className="flex flex-wrap gap-1.5">
        {FIBONACCI.map((n) => (
          <button
            key={n}
            onClick={() => onChange(valor === n ? null : n)}
            className={cn(
              "w-9 h-9 rounded-[3px] text-sm font-semibold transition-all",
              valor === n
                ? "bg-[#0C66E4] text-white shadow-sm"
                : "bg-[var(--trello-hover)] text-[var(--trello-text)] hover:bg-[var(--trello-border)]"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
