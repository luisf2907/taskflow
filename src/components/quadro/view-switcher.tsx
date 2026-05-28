"use client";

import { CalendarDays, Crosshair, Kanban, List, Table } from "lucide-react";

import { SegmentedControl } from "@/components/ui/segmented-control";

export type ViewMode = "kanban" | "lista" | "tabela" | "calendario" | "epicos";

interface ViewSwitcherProps {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

const VIEWS = [
  { id: "kanban" as const, icon: Kanban, label: "Kanban" },
  { id: "lista" as const, icon: List, label: "Lista" },
  { id: "tabela" as const, icon: Table, label: "Tabela" },
  { id: "calendario" as const, icon: CalendarDays, label: "Calendário" },
  { id: "epicos" as const, icon: Crosshair, label: "Épicos" },
];

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <SegmentedControl
      items={VIEWS}
      value={view}
      onChange={onChange}
      variant="pill"
      size="sm"
      monoCaps
      aria-label="Modo de visualização"
    />
  );
}
