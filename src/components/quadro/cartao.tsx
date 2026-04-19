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
import { motion } from "motion/react";
import { memo, useMemo } from "react";
import { CartaoComResumo } from "@/hooks/use-cartoes";
import { formatarData, statusData } from "./seletor-data";
import { GrupoAvatar } from "./avatar";
import { getContrastTextColor } from "@/lib/colors";
import { fadeUp, staggerContainer } from "@/lib/motion/presets";

interface CartaoProps {
  cartao: CartaoComResumo;
  etiquetas: Etiqueta[];
  membros: Membro[];
  onClick: () => void;
}

export const Cartao = memo(function Cartao({
  cartao,
  etiquetas,
  membros,
  onClick,
}: CartaoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cartao.id,
    data: { type: "cartao", cartao },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const etiquetasDoCartao = useMemo(
    () => etiquetas.filter((e) => cartao.etiqueta_ids.includes(e.id)),
    [etiquetas, cartao.etiqueta_ids]
  );
  const membrosDoCartao = useMemo(
    () => membros.filter((m) => cartao.membro_ids.includes(m.id)),
    [membros, cartao.membro_ids]
  );
  const dataStatus = statusData(cartao.data_entrega);
  const temChecklist = cartao.total_checklist_itens > 0;
  const checklistCompleto =
    temChecklist && cartao.total_checklist_concluidos === cartao.total_checklist_itens;
  const temPR = !!cartao.pr_numero;
  const temIndicadores =
    cartao.data_entrega ||
    cartao.descricao ||
    temChecklist ||
    cartao.total_anexos > 0 ||
    cartao.peso ||
    membrosDoCartao.length > 0 ||
    temPR ||
    cartao.branch;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: "manipulation" }}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`Card: ${cartao.titulo}`}
      aria-roledescription="cartão arrastável"
      className={cn(
        "card-surface relative px-3.5 md:px-3 py-3 md:py-2.5 cursor-pointer group overflow-hidden",
        isDragging && "opacity-60 rotate-1"
      )}
      onClick={onClick}
    >
      {/* Barra colorida vertical à esquerda — estilo Linear, até 3 cores de etiqueta */}
      {etiquetasDoCartao.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex flex-col pointer-events-none">
          {etiquetasDoCartao.slice(0, 3).map((e) => (
            <span
              key={e.id}
              className="flex-1 w-[3px]"
              style={{ background: e.cor }}
              title={e.nome}
            />
          ))}
        </div>
      )}

      <div className={etiquetasDoCartao.length > 0 ? "pl-1.5" : ""}>
        {/* Etiquetas como pills compactas — stagger ao montar e quando
            uma nova etiqueta aparece (key-based mount) */}
        {etiquetasDoCartao.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-1 mb-1.5"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {etiquetasDoCartao.map((etiqueta) => (
              <motion.span
                key={etiqueta.id}
                variants={fadeUp}
                className="px-1.5 h-[16px] flex items-center text-[0.625rem] font-medium leading-none"
                style={{
                  backgroundColor: etiqueta.cor,
                  color: getContrastTextColor(etiqueta.cor),
                  borderRadius: "var(--tf-radius-xs)",
                  letterSpacing: "0.01em",
                }}
              >
                {etiqueta.nome}
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* Título */}
        <p
          className="text-[0.875rem] md:text-[0.8125rem] leading-snug font-medium"
          style={{
            color: "var(--tf-text)",
            letterSpacing: "-0.005em",
          }}
        >
          {cartao.titulo}
        </p>

        {/* Indicadores */}
        {temIndicadores && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {temPR && (
              <span
                className="inline-flex items-center gap-1 px-1.5 h-[17px] text-[0.625rem] font-medium"
                style={{
                  color:
                    cartao.pr_status === "open"
                      ? "var(--tf-success)"
                      : cartao.pr_status === "merged"
                        ? "var(--tf-accent)"
                        : "var(--tf-danger)",
                  background:
                    cartao.pr_status === "open"
                      ? "var(--tf-success-bg)"
                      : cartao.pr_status === "merged"
                        ? "var(--tf-accent-light)"
                        : "var(--tf-danger-bg)",
                  border: "1px solid",
                  borderColor:
                    cartao.pr_status === "open"
                      ? "var(--tf-success)"
                      : cartao.pr_status === "merged"
                        ? "var(--tf-accent)"
                        : "var(--tf-danger)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                <GitPullRequest size={9} strokeWidth={2} />#{cartao.pr_numero}
              </span>
            )}

            {cartao.branch && (
              <span
                className="inline-flex items-center gap-1 px-1.5 h-[17px] text-[0.625rem] font-medium truncate max-w-[120px]"
                style={{
                  background: "var(--tf-bg-secondary)",
                  color: "var(--tf-text-secondary)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
                title={cartao.branch}
              >
                <GitBranch size={9} strokeWidth={2} />
                {cartao.branch}
              </span>
            )}

            {cartao.data_entrega && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 h-[17px] text-[0.625rem] font-medium"
                )}
                style={{
                  color:
                    dataStatus === "vencido"
                      ? "#FFFFFF"
                      : dataStatus === "proximo"
                        ? "var(--tf-warning)"
                        : "var(--tf-text-tertiary)",
                  background:
                    dataStatus === "vencido"
                      ? "var(--tf-danger)"
                      : dataStatus === "proximo"
                        ? "var(--tf-warning-bg)"
                        : "transparent",
                  border:
                    dataStatus === "normal"
                      ? "1px solid var(--tf-border)"
                      : dataStatus === "proximo"
                        ? "1px solid var(--tf-warning)"
                        : "none",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                <Calendar size={9} strokeWidth={2} />
                {formatarData(cartao.data_entrega)}
              </span>
            )}

            {cartao.data_conclusao && (
              <span
                className="inline-flex items-center gap-1 px-1.5 h-[17px] text-[0.625rem] font-medium"
                style={{
                  background: "var(--tf-success-bg)",
                  color: "var(--tf-success)",
                  border: "1px solid var(--tf-success)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
                title={`Concluído em ${formatarData(cartao.data_conclusao)}`}
              >
                <CalendarCheck size={9} strokeWidth={2} />
                {formatarData(cartao.data_conclusao)}
              </span>
            )}

            {cartao.descricao && (
              <span style={{ color: "var(--tf-text-tertiary)" }} title="Descrição">
                <AlignLeft size={11} strokeWidth={1.75} />
              </span>
            )}

            {temChecklist && (
              <span
                className="inline-flex items-center gap-1 px-1 h-[17px] text-[0.625rem] font-medium"
                style={{
                  color: checklistCompleto ? "var(--tf-success)" : "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                <CheckSquare size={10} strokeWidth={2} />
                {cartao.total_checklist_concluidos}/{cartao.total_checklist_itens}
              </span>
            )}

            {cartao.total_anexos > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-[0.625rem] font-medium"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                <Paperclip size={10} strokeWidth={2} />
                {cartao.total_anexos}
              </span>
            )}

            {cartao.peso && (
              <span
                className="inline-flex items-center gap-0.5 px-1.5 h-[17px] text-[0.625rem] font-medium"
                style={{
                  background: "var(--tf-accent-light)",
                  color: "var(--tf-accent-text)",
                  border: "1px solid var(--tf-accent)",
                  borderRadius: "var(--tf-radius-xs)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                <Gauge size={9} strokeWidth={2} />
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
    </div>
  );
});
