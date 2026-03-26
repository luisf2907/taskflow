"use client";

import React from "react";

interface EmptyStateProps {
  icone: React.ElementType;
  titulo: string;
  descricao: string;
  acaoLabel?: string;
  onAcao?: () => void;
}

export function EmptyState({ icone: Icone, titulo, descricao, acaoLabel, onAcao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div
        className="w-16 h-16 rounded-[20px] flex items-center justify-center"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        <Icone size={28} style={{ color: "var(--tf-text-tertiary)" }} />
      </div>

      <h3
        className="text-[17px] font-bold"
        style={{ color: "var(--tf-text)" }}
      >
        {titulo}
      </h3>

      <p
        className="text-[14px] max-w-sm"
        style={{ color: "var(--tf-text-secondary)" }}
      >
        {descricao}
      </p>

      {acaoLabel && onAcao && (
        <button
          onClick={onAcao}
          className="px-6 py-3 rounded-[14px] text-[14px] font-bold text-white hover:-translate-y-0.5 transition-all mt-2"
          style={{ background: "var(--tf-accent)" }}
        >
          {acaoLabel}
        </button>
      )}
    </div>
  );
}
