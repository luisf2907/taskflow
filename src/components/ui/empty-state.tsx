"use client";

import React from "react";
import { Illustration, type IllustrationName } from "./illustrations";

interface EmptyStateProps {
  /** Icone compacto (fallback se nao passar ilustracao) */
  icone?: React.ElementType;
  /** Ilustracao tematica — mais distintiva que o icone */
  ilustracao?: IllustrationName;
  /** Label curto acima do titulo (default: "Nada por aqui") */
  overline?: string;
  titulo: string;
  descricao: string;
  acaoLabel?: string;
  onAcao?: () => void;
  /** Acao secundaria opcional */
  acaoSecundariaLabel?: string;
  onAcaoSecundaria?: () => void;
}

export function EmptyState({
  icone: Icone,
  ilustracao,
  overline = "Nada por aqui",
  titulo,
  descricao,
  acaoLabel,
  onAcao,
  acaoSecundariaLabel,
  onAcaoSecundaria,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 gap-4 text-center px-4">
      {ilustracao ? (
        <div
          className="flex items-center justify-center"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          <Illustration name={ilustracao} size={148} />
        </div>
      ) : Icone ? (
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
      ) : null}

      <div className="flex flex-col gap-1.5">
        {overline && (
          <span
            className="label-mono"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            {overline}
          </span>
        )}

        <h3
          className="text-[1.125rem] md:text-[1.0625rem] font-semibold"
          style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
        >
          {titulo}
        </h3>

        <p
          className="text-[0.8125rem] max-w-sm mx-auto leading-relaxed"
          style={{ color: "var(--tf-text-secondary)" }}
        >
          {descricao}
        </p>
      </div>

      {(acaoLabel || acaoSecundariaLabel) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
          {acaoLabel && onAcao && (
            <button
              onClick={onAcao}
              className="h-9 px-4 text-[0.8125rem] font-medium text-white transition-smooth hover:brightness-110"
              style={{
                background: "var(--tf-accent)",
                border: "1px solid var(--tf-accent)",
                borderRadius: "var(--tf-radius-sm)",
              }}
            >
              {acaoLabel}
            </button>
          )}
          {acaoSecundariaLabel && onAcaoSecundaria && (
            <button
              onClick={onAcaoSecundaria}
              className="h-9 px-4 text-[0.8125rem] font-medium transition-smooth hover:bg-[var(--tf-surface-hover)]"
              style={{
                background: "transparent",
                color: "var(--tf-text-secondary)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-sm)",
              }}
            >
              {acaoSecundariaLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
