"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

export function BacklogPuroDropZone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "backlog-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className="rounded-[14px] transition-all duration-200 min-h-[80px]"
      style={{
        padding: isOver ? "12px" : "0",
        border: isOver
          ? "2px solid var(--tf-accent)"
          : "2px solid transparent",
        background: isOver ? "var(--tf-accent-light)" : "transparent",
      }}
    >
      {children}
    </div>
  );
}

interface SprintDropZoneProps {
  sprintId: string;
  sprintNome: string;
  cor: string;
  children: ReactNode;
}

export function SprintDropZone({
  sprintId,
  cor,
  children,
}: SprintDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-drop-${sprintId}`,
    data: { sprintId },
  });

  return (
    <div
      ref={setNodeRef}
      className="rounded-[14px] transition-all duration-200 min-h-[80px]"
      style={{
        padding: isOver ? "12px" : "0",
        border: isOver ? `2px solid ${cor}` : "2px solid transparent",
        background: isOver ? `${cor}15` : "transparent",
      }}
    >
      {children}
    </div>
  );
}
