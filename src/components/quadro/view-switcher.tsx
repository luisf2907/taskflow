"use client";

import { Kanban, List, Table } from "lucide-react";

export type ViewMode = "kanban" | "lista" | "tabela";

interface ViewSwitcherProps {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

const VIEWS: { id: ViewMode; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: "kanban", icon: Kanban, label: "Kanban" },
  { id: "lista", icon: List, label: "Lista" },
  { id: "tabela", icon: Table, label: "Tabela" },
];

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div
      className="flex rounded-[8px] p-0.5 shrink-0"
      style={{ background: "var(--tf-bg-secondary)" }}
    >
      {VIEWS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-[8px] transition-all"
          style={{
            background: view === id ? "var(--tf-surface)" : "transparent",
            color: view === id ? "var(--tf-text)" : "var(--tf-text-tertiary)",
            boxShadow: view === id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <Icon size={13} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
