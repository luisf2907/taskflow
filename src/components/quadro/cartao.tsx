"use client";

import { cn } from "@/lib/utils";
import { Etiqueta, Membro } from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  Calendar,
  CalendarCheck,
  CheckSquare,
  Gauge,
  GitBranch,
  GitPullRequest,
  Paperclip,
} from "lucide-react";
import { memo, useMemo } from "react";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { formatarData, statusData } from "./seletor-data";
import { GrupoAvatar } from "./avatar";
import { getContrastTextColor } from "@/lib/colors";

interface CartaoProps {
  cartao: CartaoComResumo;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onClick: () => void;
}

export const Cartao = memo(function Cartao({ cartao, etiquetas, membros, onClick }: CartaoProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: cartao.id, data: { type: "cartao", cartao } });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const etiquetasDoCartao = useMemo(() => etiquetas.filter((e) => cartao.etiqueta_ids.includes(e.id)), [etiquetas, cartao.etiqueta_ids]);
  const membrosDoCartao = useMemo(() => membros.filter((m) => cartao.membro_ids.includes(m.id)), [membros, cartao.membro_ids]);
  const dataStatus = statusData(cartao.data_entrega);
  const temChecklist = cartao.total_checklist_itens > 0;
  const checklistCompleto = temChecklist && cartao.total_checklist_concluidos === cartao.total_checklist_itens;
  const temPR = !!cartao.pr_numero;
  const temIndicadores = cartao.data_entrega || cartao.descricao || temChecklist || cartao.total_anexos > 0 || cartao.peso || membrosDoCartao.length > 0 || temPR || cartao.branch;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`Card: ${cartao.titulo}`}
      aria-roledescription="cartão arrastável"
      className={cn(
        "card-surface px-3.5 py-3 cursor-pointer group",
        isDragging && "opacity-60 rotate-2 scale-[1.02]"
      )}
      onClick={onClick}
    >
      {/* Labels — small dots/pills */}
      {etiquetasDoCartao.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {etiquetasDoCartao.map((etiqueta) => (
            <span
              key={etiqueta.id}
              className="px-2 py-[2px] rounded-[4px] text-[10px] font-bold leading-tight"
              style={{ backgroundColor: etiqueta.cor, color: getContrastTextColor(etiqueta.cor) }}
            >
              {etiqueta.nome}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-[13px] leading-snug font-medium" style={{ color: "var(--tf-text)" }}>
        {cartao.titulo}
      </p>

      {/* Badges — compact row */}
      {temIndicadores && (
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          {temPR && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold"
              style={{
                color: cartao.pr_status === "open" ? "var(--tf-success)" : cartao.pr_status === "merged" ? "var(--tf-accent)" : "var(--tf-danger)",
                background: cartao.pr_status === "open" ? "var(--tf-success-bg)" : cartao.pr_status === "merged" ? "var(--tf-accent-light)" : "var(--tf-danger-bg)",
              }}
            >
              <GitPullRequest size={10} />
              #{cartao.pr_numero}
            </span>
          )}

          {cartao.branch && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-medium truncate max-w-[120px]"
              style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}
              title={cartao.branch}
            >
              <GitBranch size={9} />
              {cartao.branch}
            </span>
          )}

          {cartao.data_entrega && (
            <span
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold",
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

          {cartao.data_conclusao && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold"
              style={{ background: "var(--tf-success-bg)", color: "var(--tf-success)" }}
              title={`Concluído em ${formatarData(cartao.data_conclusao)}`}
            >
              <CalendarCheck size={10} />
              {formatarData(cartao.data_conclusao)}
            </span>
          )}

          {cartao.descricao && (
            <span style={{ color: "var(--tf-text-tertiary)" }} title="Descrição">
              <AlignLeft size={12} />
            </span>
          )}

          {temChecklist && (
            <span
              className="flex items-center gap-1 px-1 py-0.5 rounded-[4px] text-[10px] font-bold"
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
            <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: "var(--tf-text-tertiary)" }}>
              <Paperclip size={10} />
              {cartao.total_anexos}
            </span>
          )}

          {cartao.peso && (
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold"
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
});
