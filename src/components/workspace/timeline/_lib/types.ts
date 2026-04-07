import type { Quadro } from "@/types";
import type { CartaoBacklog } from "@/hooks/use-backlog";

export type Zoom = "semana" | "mes" | "trimestre";
export type DragMode = "move" | "resize-start" | "resize-end";

export interface DragState {
  sprintId: string;
  mode: DragMode;
  startX: number;
  originalInicio: Date;
  originalFim: Date;
  currentInicio: Date;
  currentFim: Date;
}

export interface CreatingDep {
  fromSprintId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface SprintRect {
  x: number;
  y: number;
  w: number;
  h: number;
  inicio: Date;
  fim: Date;
}

export interface TimelineViewProps {
  sprints: Quadro[];
  cartoesDaSprint: (quadroId: string) => CartaoBacklog[];
  onSprintClick: (quadroId: string) => void;
  workspaceId: string;
}
