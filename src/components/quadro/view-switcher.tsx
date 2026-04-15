"use client";

import { Kanban, List, Table } from "lucide-react";
import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";

import { layoutSpring } from "@/lib/motion/presets";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";

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
  // Escopa o layoutId — se houver >1 ViewSwitcher na arvore (modal, etc)
  // os indicators nao se "teleportam" entre instancias.
  const groupId = useId();
  const reduceMotion = usePrefersReducedMotion();

  return (
    <LayoutGroup id={groupId}>
      <div
        className="relative flex shrink-0 p-0.5"
        style={{
          background: "var(--tf-bg-secondary)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-xs)",
        }}
      >
        {VIEWS.map(({ id, icon: Icon, label }) => {
          const ativo = view === id;
          return (
            <motion.button
              key={id}
              onClick={() => onChange(id)}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              transition={layoutSpring}
              className="relative flex items-center gap-1.5 h-7 px-2.5 text-[0.6875rem] font-medium"
              style={{
                color: ativo ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                // transicao manual de cor pra ficar em sincronia com o spring do indicator
                transition: "color 160ms cubic-bezier(0.32, 0.72, 0, 1)",
              }}
              aria-pressed={ativo}
            >
              {ativo && (
                <motion.span
                  layoutId="view-switcher-indicator"
                  transition={reduceMotion ? { duration: 0 } : layoutSpring}
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background: "var(--tf-surface)",
                    border: "1px solid var(--tf-border)",
                    borderRadius: "var(--tf-radius-xs)",
                    // Sombra bem sutil pra "elevar" o ativo sobre o trilho
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon size={12} strokeWidth={1.75} />
                <span className="hidden sm:inline">{label}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
