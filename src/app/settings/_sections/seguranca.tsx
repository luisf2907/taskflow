"use client";

import { LogOut, Shield } from "lucide-react";

interface SegurancaSectionProps {
  onLogout: () => void;
}

export function SegurancaSection({ onLogout }: SegurancaSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Shield
          size={12}
          strokeWidth={1.75}
          style={{ color: "var(--tf-accent)" }}
        />
        <h2 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
          Segurança
        </h2>
      </div>

      <div
        className="p-5"
        style={{
          background: "var(--tf-bg-secondary)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className="text-[0.8125rem] font-medium"
              style={{
                color: "var(--tf-text)",
                letterSpacing: "-0.005em",
              }}
            >
              Sair da conta
            </p>
            <p
              className="text-[0.6875rem] mt-0.5"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
              }}
            >
              Encerrar sessão neste dispositivo
            </p>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[0.6875rem] font-medium transition-colors hover:brightness-110"
            style={{
              color: "var(--tf-danger)",
              background: "var(--tf-danger-bg)",
              border: "1px solid var(--tf-danger)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            <LogOut size={12} strokeWidth={1.75} />
            Sair
          </button>
        </div>
      </div>
    </section>
  );
}
