"use client";

import { Kanban, List, Table } from "lucide-react";

export type ViewMode = "kanban" | "lista" | "tabela";

interface ViewSwitcherProps {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

const VIEWS: {
  id: ViewMode;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
}[] = [
  { id: "kanban", icon: Kanban, label: "Kanban" },
  { id: "lista", icon: List, label: "Lista" },
  { id: "tabela", icon: Table, label: "Tabela" },
];

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div
      className="flex shrink-0 p-0.5"
      style={{
        background: "var(--tf-bg-secondary)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-xs)",
      }}
    >
      {VIEWS.map(({ id, icon: Icon, label }) => {
        const ativo = view === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex items-center gap-1.5 h-7 px-2.5 text-[0.6875rem] font-medium transition-colors"
            style={{
              background: ativo ? "var(--tf-surface)" : "transparent",
              color: ativo ? "var(--tf-text)" : "var(--tf-text-tertiary)",
              border: ativo ? "1px solid var(--tf-border)" : "1px solid transparent",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            <Icon size={12} strokeWidth={1.75} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
