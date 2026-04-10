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

  // Etiquetas do cartão (usa etiqueta_ids da junction table)
  const etiquetasDoCartao = etiquetas.filter((e) =>
    tarefa.etiqueta_ids?.includes(e.id)
  );

  return (
    <div
      ref={setDragRef}
      className={`flex items-center gap-3 px-5 py-3 rounded-[14px] transition-all duration-300 ease-out group cursor-pointer border hover:-translate-y-0.5 ${
        isDragging ? "opacity-30 scale-95" : ""
      }`}
      style={{
        background: "var(--tf-surface)",
        borderColor: "var(--tf-border)",
      }}
      onClick={onClick}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0"
        style={{ color: "var(--tf-text-tertiary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </button>

      {/* Título + etiquetas */}
      <div className="flex-1 min-w-0">
        <span
          className="text-[13px] truncate block"
          style={{ color: "var(--tf-text)" }}
        >
          {tarefa.titulo}
        </span>
        {etiquetasDoCartao.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {etiquetasDoCartao.map((e) => (
              <span
                key={e.id}
                className="px-1.5 py-[1px] rounded text-[9px] font-bold"
                style={{ backgroundColor: e.cor, color: getContrastTextColor(e.cor) }}
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
          className="text-[11px] px-2 py-0.5 rounded-[8px] shrink-0"
          style={{
            background: tarefa.concluido
              ? "var(--tf-success-bg)"
              : "var(--tf-bg-secondary)",
            color: tarefa.concluido
              ? "var(--tf-success)"
              : "var(--tf-text-tertiary)",
            fontWeight: tarefa.concluido ? 600 : 400,
          }}
        >
          {tarefa.concluido ? "Concluído" : tarefa.coluna_nome}
        </span>
      )}

      {/* Peso */}
      {tarefa.peso && (
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: "var(--tf-accent-light)",
            color: "var(--tf-accent-text)",
          }}
        >
          <Zap size={9} className="inline mr-0.5" />
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
            className="text-[12px] px-2 py-1 rounded-[8px] outline-none"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text)",
            }}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onAssociar(tarefa.id, e.target.value);
              setSeletor(false);
            }}
            autoFocus
          >
            <option value="" disabled>
              Escolher sprint...
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
            className="p-0.5"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <X size={14} />
          </button>
        </div>
      ) : noSprint ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSeletor(true);
          }}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-[8px] opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
          style={{
            background: "var(--tf-accent-light)",
            color: "var(--tf-accent-text)",
          }}
        >
          <ArrowRight size={10} /> Mover pra sprint
        </button>
      ) : (
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            className="text-[11px] px-1.5 py-0.5 rounded-[8px] outline-none transition-smooth"
            style={{
              background: "var(--tf-bg-secondary)",
              border: "1px solid var(--tf-border)",
              color: "var(--tf-text-secondary)",
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
              Mover...
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
          className="p-1 rounded-[8px] opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
          style={{ color: "var(--tf-text-tertiary)" }}
          title="Estimar com Planning Poker"
        >
          <Layers size={13} />
        </button>
      )}

      {/* Excluir */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExcluir(tarefa.id);
        }}
        className="p-1 rounded-[8px] opacity-0 group-hover:opacity-100 transition-smooth shrink-0"
        style={{ color: "var(--tf-text-tertiary)" }}
        title="Excluir tarefa"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
