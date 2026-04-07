"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Quadro } from "@/types";
import { adicionarDias, toISODate } from "@/lib/datas";
import type {
  DragMode,
  DragState,
  CreatingDep,
  SprintRect,
} from "./_lib/types";

interface UseTimelineDragOptions {
  diaLargura: number;
  svgRef: RefObject<SVGSVGElement | null>;
  atualizarQuadro: (
    id: string,
    campos: Record<string, unknown>
  ) => Promise<unknown>;
  criarDep: (origem: string, destino: string) => Promise<unknown>;
}

export interface UseTimelineDragReturn {
  drag: DragState | null;
  creatingDep: CreatingDep | null;
  hoverSprintId: string | null;
  selectedDep: string | null;
  setHoverSprintId: (id: string | null) => void;
  setSelectedDep: (id: string | null) => void;
  iniciarDrag: (e: React.MouseEvent, sprint: Quadro, mode: DragMode) => void;
  iniciarCriacaoDep: (
    e: React.MouseEvent,
    sprint: Quadro,
    rect: SprintRect
  ) => void;
}

/**
 * Encapsula toda a logica de drag/resize de sprints e criacao de dependencias
 * na timeline. Mantem refs sincronizados com state para evitar stale closures
 * dentro dos handlers globais de mousemove/mouseup.
 */
export function useTimelineDrag({
  diaLargura,
  svgRef,
  atualizarQuadro,
  criarDep,
}: UseTimelineDragOptions): UseTimelineDragReturn {
  // Drag state
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Creating dependency state
  const [creatingDep, setCreatingDep] = useState<CreatingDep | null>(null);
  const creatingDepRef = useRef<CreatingDep | null>(null);
  const [hoverSprintId, setHoverSprintId] = useState<string | null>(null);

  // Selected dependency (for delete)
  const [selectedDep, setSelectedDep] = useState<string | null>(null);

  function iniciarDrag(e: React.MouseEvent, sprint: Quadro, mode: DragMode) {
    e.stopPropagation();
    e.preventDefault();
    const inicio = new Date(sprint.data_inicio!);
    const fim = new Date(sprint.data_fim!);
    const state: DragState = {
      sprintId: sprint.id,
      mode,
      startX: e.clientX,
      originalInicio: inicio,
      originalFim: fim,
      currentInicio: inicio,
      currentFim: fim,
    };
    setDrag(state);
    dragRef.current = state;
  }

  // Iniciar criacao de dependencia (a partir do handle direito da barra)
  function iniciarCriacaoDep(
    e: React.MouseEvent,
    sprint: Quadro,
    rect: SprintRect
  ) {
    e.stopPropagation();
    e.preventDefault();
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const fromX = rect.x + rect.w;
    const fromY = rect.y + rect.h / 2;
    const novo: CreatingDep = {
      fromSprintId: sprint.id,
      fromX,
      fromY,
      toX: e.clientX - svgRect.left,
      toY: e.clientY - svgRect.top,
    };
    creatingDepRef.current = novo;
    setCreatingDep(novo);
  }

  // Mouse move global durante drag
  useEffect(() => {
    function handleMove(e: MouseEvent) {
      // Drag de sprint
      if (dragRef.current) {
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaDias = Math.round(deltaX / diaLargura);

        const novo = { ...dragRef.current };
        if (novo.mode === "move") {
          novo.currentInicio = adicionarDias(novo.originalInicio, deltaDias);
          novo.currentFim = adicionarDias(novo.originalFim, deltaDias);
        } else if (novo.mode === "resize-start") {
          const novaInicio = adicionarDias(novo.originalInicio, deltaDias);
          if (novaInicio < novo.originalFim) novo.currentInicio = novaInicio;
        } else if (novo.mode === "resize-end") {
          const novaFim = adicionarDias(novo.originalFim, deltaDias);
          if (novaFim > novo.originalInicio) novo.currentFim = novaFim;
        }
        dragRef.current = novo;
        setDrag(novo);
      }

      // Criando dependencia
      if (creatingDepRef.current && svgRef.current) {
        const svgRect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - svgRect.left;
        const y = e.clientY - svgRect.top;
        const novo = { ...creatingDepRef.current, toX: x, toY: y };
        creatingDepRef.current = novo;
        setCreatingDep(novo);
      }
    }

    async function handleUp() {
      // Finalizar drag
      if (dragRef.current) {
        const d = dragRef.current;
        const inicioStr = toISODate(d.currentInicio);
        const fimStr = toISODate(d.currentFim);
        const inicioOriginalStr = toISODate(d.originalInicio);
        const fimOriginalStr = toISODate(d.originalFim);

        if (
          inicioStr !== inicioOriginalStr ||
          fimStr !== fimOriginalStr
        ) {
          await atualizarQuadro(d.sprintId, {
            data_inicio: inicioStr,
            data_fim: fimStr,
          });
        }

        dragRef.current = null;
        setDrag(null);
      }

      // Finalizar criacao de dependencia
      if (creatingDepRef.current) {
        const targetSprintId = hoverSprintId;
        if (
          targetSprintId &&
          targetSprintId !== creatingDepRef.current.fromSprintId
        ) {
          await criarDep(creatingDepRef.current.fromSprintId, targetSprintId);
        }
        creatingDepRef.current = null;
        setCreatingDep(null);
      }
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [diaLargura, atualizarQuadro, criarDep, hoverSprintId, svgRef]);

  return {
    drag,
    creatingDep,
    hoverSprintId,
    selectedDep,
    setHoverSprintId,
    setSelectedDep,
    iniciarDrag,
    iniciarCriacaoDep,
  };
}
