"use client";

import { cn } from "@/lib/utils";
import { Etiqueta, Membro } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  Gauge,
  Paperclip,
} from "lucide-react";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { formatarData, statusData } from "./seletor-data";
import { GrupoAvatar } from "./avatar";

interface CartaoProps {
  cartao: CartaoComResumo;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onClick: () => void;
}

export function Cartao({ cartao, etiquetas, membros, onClick }: CartaoProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: cartao.id, data: { type: "cartao", cartao } });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const etiquetasDoCartao = etiquetas.filter((e) => cartao.etiqueta_ids.includes(e.id));
  const membrosDoCartao = membros.filter((m) => cartao.membro_ids.includes(m.id));
  const dataStatus = statusData(cartao.data_entrega);
  const temChecklist = cartao.total_checklist_itens > 0;
  const checklistCompleto = temChecklist && cartao.total_checklist_concluidos === cartao.total_checklist_itens;
  const temIndicadores = cartao.data_entrega || cartao.descricao || temChecklist || cartao.total_anexos > 0 || cartao.peso || membrosDoCartao.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "card-surface px-3 py-2.5 cursor-pointer transition-smooth",
        isDragging && "opacity-60 shadow-xl rotate-1 scale-[1.02]"
      )}
      onClick={onClick}
    >
      {/* Labels */}
      {etiquetasDoCartao.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {etiquetasDoCartao.map((etiqueta) => (
            <span
              key={etiqueta.id}
              className="px-2 py-[2px] rounded text-[10px] font-bold text-white leading-tight"
              style={{ backgroundColor: etiqueta.cor }}
            >
              {etiqueta.nome}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-[13px] leading-snug mb-0.5" style={{ color: "var(--tf-text)" }}>
        {cartao.titulo}
      </p>

      {/* Badges */}
      {temIndicadores && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {cartao.data_entrega && (
            <span
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
                dataStatus === "vencido" && "text-white",
                dataStatus === "proximo" && "text-[var(--tf-warning)]",
                dataStatus === "normal" && "text-[var(--tf-text-tertiary)]"
              )}
              style={dataStatus === "vencido" ? { background: "var(--tf-danger)" } : dataStatus === "proximo" ? { background: "var(--tf-warning-bg)" } : {}}
            >
              <Calendar size={10} />
              {formatarData(cartao.data_entrega)}
            </span>
          )}

          {cartao.descricao && (
            <span style={{ color: "var(--tf-text-tertiary)" }} title="Descrição">
              <AlignLeft size={13} />
            </span>
          )}

          {temChecklist && (
            <span
              className="flex items-center gap-1 px-1 py-0.5 rounded text-[11px] font-medium"
              style={{
                color: checklistCompleto ? "var(--tf-success)" : "var(--tf-text-tertiary)",
                background: checklistCompleto ? "var(--tf-success-bg)" : "transparent",
              }}
            >
              <CheckSquare size={10} />
              {cartao.total_checklist_concluidos}/{cartao.total_checklist_itens}
            </span>
          )}

          {cartao.total_anexos > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>
              <Paperclip size={10} />
              {cartao.total_anexos}
            </span>
          )}

          {cartao.peso && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold"
              style={{ background: "var(--tf-accent-light)", color: "var(--tf-accent-text)" }}
            >
              <Gauge size={9} />
              {cartao.peso}
            </span>
          )}

          {membrosDoCartao.length > 0 && (
            <div className="ml-auto">
              <GrupoAvatar membros={membrosDoCartao} max={3} tamanho="sm" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
