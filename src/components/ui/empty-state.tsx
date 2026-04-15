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
    <div className="flex flex-col items-center justify-center py-16 gap-3.5 text-center">
      <div
        className="w-12 h-12 flex items-center justify-center"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-sm)",
          color: "var(--tf-text-tertiary)",
        }}
      >
        <Icone size={22} strokeWidth={1.75} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span
          className="label-mono"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Nada por aqui
        </span>

        <h3
          className="text-[1.0625rem] font-semibold"
          style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
        >
          {titulo}
        </h3>

        <p
          className="text-[0.8125rem] max-w-sm mx-auto"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          {descricao}
        </p>
      </div>

      {acaoLabel && onAcao && (
        <button
          onClick={onAcao}
          className="mt-1 h-9 px-4 text-[0.8125rem] font-medium text-white transition-smooth hover:brightness-110"
          style={{
            background: "var(--tf-accent)",
            border: "1px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-sm)",
          }}
        >
          {acaoLabel}
        </button>
      )}
    </div>
  );
}
