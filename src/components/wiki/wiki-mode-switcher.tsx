"use client";

import { PenLine, Code2 } from "lucide-react";

export type WikiEditMode = "editor" | "markdown";

interface WikiModeSwitcherProps {
  modo: WikiEditMode;
  onChange: (modo: WikiEditMode) => void;
}

const MODOS: { id: WikiEditMode; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: "editor", icon: PenLine, label: "Notion" },
  { id: "markdown", icon: Code2, label: "Markdown" },
];

export function WikiModeSwitcher({ modo, onChange }: WikiModeSwitcherProps) {
  return (
    <div
      className="flex rounded-[8px] p-0.5 shrink-0"
      style={{ background: "var(--tf-bg-secondary)" }}
    >
      {MODOS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-[6px] transition-all"
          style={{
            background: modo === id ? "var(--tf-surface)" : "transparent",
            color: modo === id ? "var(--tf-text)" : "var(--tf-text-tertiary)",
            boxShadow: modo === id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          <Icon size={12} />
          {label}
        </button>
      ))}
    </div>
  );
}
