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
      className="transition-all duration-200 min-h-[80px]"
      style={{
        padding: isOver ? "10px" : "0",
        border: isOver
          ? "1px dashed var(--tf-accent)"
          : "1px dashed transparent",
        background: isOver ? "var(--tf-accent-light)" : "transparent",
        borderRadius: "var(--tf-radius-md)",
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

export function SprintDropZone({ sprintId, cor, children }: SprintDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-drop-${sprintId}`,
    data: { sprintId },
  });

  return (
    <div
      ref={setNodeRef}
      className="transition-all duration-200 min-h-[80px]"
      style={{
        padding: isOver ? "10px" : "0",
        border: isOver ? `1px dashed ${cor}` : "1px dashed transparent",
        background: isOver ? `color-mix(in srgb, ${cor} 12%, transparent)` : "transparent",
        borderRadius: "var(--tf-radius-md)",
      }}
    >
      {children}
    </div>
  );
}
