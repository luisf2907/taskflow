"use client";

import { Calendar, X } from "lucide-react";

interface SeletorDataProps {
  valor: string | null;
  onChange: (data: string | null) => void;
}

export function statusData(
  dataEntrega: string | null
): "normal" | "proximo" | "vencido" | null {
  if (!dataEntrega) return null;
  const agora = new Date();
  const entrega = new Date(dataEntrega);
  const diff = entrega.getTime() - agora.getTime();
  const horasRestantes = diff / (1000 * 60 * 60);

  if (horasRestantes < 0) return "vencido";
  if (horasRestantes < 24) return "proximo";
  return "normal";
}

export function formatarData(data: string): string {
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function SeletorData({ valor, onChange }: SeletorDataProps) {
  return (
    <div className="space-y-2">
      <p className="label-mono" style={{ color: "var(--tf-text-tertiary)" }}>
        Data de Entrega
      </p>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-2 data-wrapper">
          <Calendar
            size={12}
            strokeWidth={1.75}
            className="ml-2.5 shrink-0 pointer-events-none"
            style={{ color: "var(--tf-text-tertiary)" }}
          />
          <input
            type="datetime-local"
            value={valor ? new Date(valor).toISOString().slice(0, 16) : ""}
            onChange={(e) =>
              onChange(e.target.value ? new Date(e.target.value).toISOString() : null)
            }
            className="w-full bg-transparent pr-2.5 py-2 text-[0.8125rem] outline-none"
            style={{
              color: "var(--tf-text)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.01em",
            }}
          />
        </div>
        {valor && (
          <button
            onClick={() => onChange(null)}
            className="p-1.5 transition-colors hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
            style={{
              color: "var(--tf-text-tertiary)",
              borderRadius: "var(--tf-radius-xs)",
            }}
            title="Remover data"
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        )}
      </div>
      <style jsx>{`
        .data-wrapper {
          background: var(--tf-surface);
          border: 1px solid var(--tf-border);
          border-radius: var(--tf-radius-xs);
          transition: border-color 0.15s ease;
        }
        .data-wrapper:focus-within {
          border-color: var(--tf-accent);
        }
      `}</style>
    </div>
  );
}
