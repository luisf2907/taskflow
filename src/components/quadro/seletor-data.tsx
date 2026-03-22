"use client";

import { Calendar, X } from "lucide-react";

interface SeletorDataProps {
  valor: string | null;
  onChange: (data: string | null) => void;
}

export function statusData(dataEntrega: string | null): "normal" | "proximo" | "vencido" | null {
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
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--tf-text-tertiary)" }}>
        Data de Entrega
      </p>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-2 rounded-[14px] overflow-hidden"
          style={{
            background: "var(--tf-bg-secondary)",
            border: "2px solid var(--tf-border)",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tf-accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tf-border)")}
        >
          <Calendar
            size={13}
            className="ml-3 shrink-0 pointer-events-none"
            style={{ color: "var(--tf-text-tertiary)" }}
          />
          <input
            type="datetime-local"
            value={valor ? new Date(valor).toISOString().slice(0, 16) : ""}
            onChange={(e) =>
              onChange(e.target.value ? new Date(e.target.value).toISOString() : null)
            }
            className="w-full bg-transparent pr-3 py-2.5 text-[13px] outline-none"
            style={{ color: "var(--tf-text)" }}
          />
        </div>
        {valor && (
          <button
            onClick={() => onChange(null)}
            className="p-2 rounded-[8px] hover:bg-[var(--tf-danger-bg)]"
            style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-danger)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
            title="Remover data"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
