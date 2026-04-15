"use client";

import React from "react";

interface PropertyRowProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  children?: React.ReactNode;
}

/**
 * Linha de propriedade na sidebar direita do detalhe de cartão.
 * Esquerda: ícone + label. Direita: valor atual ou "Definir" (hover).
 * Active: border-left laranja 2px + bg tint.
 */
export function PropertyRow({
  icon,
  label,
  onClick,
  active,
  children,
}: PropertyRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between h-8 pl-3 pr-2 group transition-colors relative outline-none"
      style={{
        background: active ? "var(--tf-accent-light)" : "transparent",
        borderRadius: "var(--tf-radius-xs)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--tf-surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {/* Border-left accent indicator (active state) */}
      <span
        aria-hidden
        className="absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full transition-all"
        style={{ background: active ? "var(--tf-accent)" : "transparent" }}
      />

      <div className="flex items-center gap-2">
        <span
          style={{
            color: active ? "var(--tf-accent)" : "var(--tf-text-tertiary)",
          }}
        >
          {icon}
        </span>
        <span
          className="text-[0.75rem] font-medium"
          style={{
            color: active ? "var(--tf-accent-text)" : "var(--tf-text-secondary)",
            letterSpacing: "-0.005em",
          }}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center">
        {children || (
          <span
            className="text-[0.625rem] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Definir
          </span>
        )}
      </div>
    </button>
  );
}
