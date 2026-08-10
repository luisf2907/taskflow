"use client";

import { Lock } from "lucide-react";

/**
 * Pílula "PRO" para marcar um recurso bloqueado. Fica ao lado do rótulo em
 * botões com texto; onde só cabe ícone, use <CadeadoPro/>.
 */
export function SeloPro() {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1 h-[15px] text-[9px] font-bold shrink-0"
      style={{
        background: "var(--tf-accent-light)",
        color: "var(--tf-accent-text)",
        borderRadius: "var(--tf-radius-xs)",
        fontFamily: "var(--tf-font-mono)",
        letterSpacing: "0.04em",
      }}
    >
      <Lock size={8} strokeWidth={2.5} aria-hidden="true" />
      PRO
    </span>
  );
}

/**
 * Cadeado sobreposto ao canto de um botão só-ícone (header). O wrapper
 * precisa ser `relative`.
 */
export function CadeadoPro() {
  return (
    <span
      aria-hidden="true"
      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 flex items-center justify-center"
      style={{
        background: "var(--tf-surface)",
        color: "var(--tf-accent-text)",
        borderRadius: "999px",
      }}
    >
      <Lock size={8} strokeWidth={3} />
    </span>
  );
}
