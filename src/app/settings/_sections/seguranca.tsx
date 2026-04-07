"use client";

import { LogOut, Shield } from "lucide-react";

interface SegurancaSectionProps {
  onLogout: () => void;
}

export function SegurancaSection({ onLogout }: SegurancaSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={14} style={{ color: "var(--tf-accent)" }} />
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Segurança
        </h2>
      </div>

      <div
        className="rounded-[20px] p-6"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[13px] font-semibold"
              style={{ color: "var(--tf-text)" }}
            >
              Sair da conta
            </p>
            <p
              className="text-[12px] mt-0.5"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              Encerrar sessão neste dispositivo.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-[12px] font-semibold transition-all duration-150 hover:opacity-80"
            style={{
              color: "var(--tf-danger)",
              background: "var(--tf-danger-bg)",
            }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    </section>
  );
}
