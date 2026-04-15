"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  ArrowRight,
  GripVertical,
  Layers,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type { CartaoBacklog } from "@/hooks/use-backlog";
import type { Etiqueta, Quadro } from "@/types";
import { getContrastTextColor } from "@/lib/colors";

interface BacklogRowProps {
  tarefa: CartaoBacklog;
  sprints: Quadro[];
  etiquetas: Etiqueta[];
  isLast: boolean;
  onAssociar: (cartaoId: string, quadroId: string) => void;
  onDesassociar: (cartaoId: string, quadroIdOriginal: string) => void;
  onMover: (
    cartaoId: string,
    quadroIdOriginal: string,
    quadroIdNovo: string
  ) => void;
  onExcluir: (cartaoId: string) => void;
  onClick: () => void;
  onEstimar?: (cartaoId: string) => void;
}

export function BacklogRow({
  tarefa,
  sprints,
  etiquetas,
  onAssociar,
  onDesassociar,
  onMover,
  onExcluir,
  onClick,
  onEstimar,
}: BacklogRowProps) {
  const [seletor, setSeletor] = useState(false);
  const noSprint = !tarefa.coluna_id;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
    useDraggable({
      id: `backlog-${tarefa.id}`,
      data: { tarefa },
    });

  const etiquetasDoCartao = etiquetas.filter((e) =>
    tarefa.etiqueta_ids?.includes(e.id)
  );

  return (
    <div
      ref={setDragRef}
      className={`flex items-center gap-2.5 px-3 py-2 transition-all duration-200 group cursor-pointer ${
        isDragging ? "opacity-30" : ""
      }`}
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-sm)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "var(--tf-border-strong)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "var(--tf-border)")
      }
      onClick={onClick}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0"
        style={{
          color: "var(--tf-text-tertiary)",
          borderRadius: "var(--tf-radius-xs)",
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Arrastar"
      >
        <GripVertical size={13} strokeWidth={1.75} />
      </button>

      {/* Título + etiquetas */}
      <div className="flex-1 min-w-0">
        <span
          className="text-[0.8125rem] truncate block"
          style={{
            color: "var(--tf-text)",
            letterSpacing: "-0.005em",
          }}
        >
          {tarefa.titulo}
        </span>
        {etiquetasDoCartao.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {etiquetasDoCartao.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center h-[15px] px-1.5 text-[0.5625rem] font-medium leading-none"
                style={{
                  backgroundColor: e.cor,
                  color: getContrastTextColor(e.cor),
                  borderRadius: "var(--tf-radius-xs)",
                  letterSpacing: "0.01em",
                }}
              >
                {e.nome}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status (coluna) */}
      {tarefa.coluna_nome && (
        <span
          className="inline-flex items-center h-[17px] px-1.5 text-[0.625rem] font-medium shrink-0"
          style={{
            background: tarefa.concluido ? "var(--tf-success-bg)" : "var(--tf-bg-secondary)",
            color: tarefa.concluido ? "var(--tf-success)" : "var(--tf-text-tertiary)",
            border: `1px solid ${tarefa.concluido ? "var(--tf-success)" : "var(--tf-border)"}`,
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {tarefa.concluido ? "Concluído" : tarefa.coluna_nome}
        </span>
      )}

      {/* Peso */}
      {tarefa.peso && (
        <span
          className="inline-flex items-center gap-0.5 h-[17px] px-1.5 text-[0.625rem] font-medium shrink-0"
          style={{
            background: "var(--tf-accent-light)",
            color: "var(--tf-accent-text)",
            border: "1px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
          }}
        >
          <Zap size={9} strokeWidth={2} />
          {tarefa.peso}
        </span>
      )}

      {/* Sprint associada ou seletor */}
      {seletor ? (
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            className="text-[0.6875rem] h-7 px-2 outline-none"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-accent)",
              color: "var(--tf-text)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
            }}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onAssociar(tarefa.id, e.target.value);
              setSeletor(false);
            }}
            autoFocus
          >
            <option value="" disabled>
              Escolher sprint…
            </option>
            {sprints
              .filter((s) => s.status_sprint !== "concluida")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
          </select>
          <button
            onClick={() => setSeletor(false)}
            className="p-0.5 transition-colors hover:text-[var(--tf-text)]"
            style={{ color: "var(--tf-text-tertiary)" }}
            aria-label="Cancelar"
          >
            <X size={12} strokeWidth={1.75} />
          </button>
        </div>
      ) : noSprint ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSeletor(true);
          }}
          className="inline-flex items-center gap-1 h-[22px] px-2 text-[0.625rem] font-medium opacity-0 group-hover:opacity-100 transition-all shrink-0 hover:brightness-110"
          style={{
            background: "var(--tf-accent-light)",
            color: "var(--tf-accent-text)",
            border: "1px solid var(--tf-accent)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          <ArrowRight size={10} strokeWidth={1.75} /> Mover p/ sprint
        </button>
      ) : (
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            className="text-[0.625rem] h-6 px-1.5 outline-none transition-colors"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text-secondary)",
              borderRadius: "var(--tf-radius-xs)",
              fontFamily: "var(--tf-font-mono)",
            }}
            defaultValue=""
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__remover__") {
                if (tarefa.quadro_id) onDesassociar(tarefa.id, tarefa.quadro_id);
              } else if (val && tarefa.quadro_id) {
                onMover(tarefa.id, tarefa.quadro_id, val);
              }
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Mover…
            </option>
            {sprints
              .filter(
                (s) =>
                  s.status_sprint !== "concluida" && s.id !== tarefa.quadro_id
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  → {s.nome}
                </option>
              ))}
            <option value="__remover__">Remover da sprint</option>
          </select>
        </div>
      )}

      {/* Estimar com Poker */}
      {onEstimar && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEstimar(tarefa.id);
          }}
          className="p-1 opacity-0 group-hover:opacity-100 transition-colors shrink-0 hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
          style={{
            color: "var(--tf-text-tertiary)",
            borderRadius: "var(--tf-radius-xs)",
          }}
          title="Estimar com Planning Poker"
        >
          <Layers size={12} strokeWidth={1.75} />
        </button>
      )}

      {/* Excluir */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExcluir(tarefa.id);
        }}
        className="p-1 opacity-0 group-hover:opacity-100 transition-colors shrink-0 hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
        style={{
          color: "var(--tf-text-tertiary)",
          borderRadius: "var(--tf-radius-xs)",
        }}
        title="Excluir tarefa"
      >
        <Trash2 size={12} strokeWidth={1.75} />
      </button>
    </div>
  );
}
