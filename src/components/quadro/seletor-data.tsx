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
      <p className="text-xs font-medium text-[var(--trello-text-subtle)] uppercase tracking-wide">
        Data de Entrega
      </p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--trello-text-subtle)] pointer-events-none"
          />
          <input
            type="datetime-local"
            value={valor ? new Date(valor).toISOString().slice(0, 16) : ""}
            onChange={(e) =>
              onChange(e.target.value ? new Date(e.target.value).toISOString() : null)
            }
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-[3px] outline-none focus:ring-2 focus:ring-[var(--trello-blue)] text-[var(--trello-text)]"
            style={{
              background: "var(--trello-card)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--trello-border)",
            }}
          />
        </div>
        {valor && (
          <button
            onClick={() => onChange(null)}
            className="p-1.5 rounded-[3px] text-[var(--trello-text-subtle)] hover:text-[#C9372C] hover:bg-[var(--trello-hover)] transition-smooth"
            title="Remover data"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
