"use client";

import { Inbox, Loader2, MoveRight, Trash2, X } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import type { Quadro } from "@/types";

interface BarraSelecaoProps {
  quantidade: number;
  sprints: Quadro[];
  /** null = devolver ao backlog puro (sem sprint). */
  onMover: (quadroIdDestino: string | null) => void;
  onExcluir: () => void;
  onLimpar: () => void;
  ocupado?: boolean;
}

/**
 * Barra flutuante de acoes em lote do backlog.
 *
 * Fica acima do bottom-nav no mobile (--tf-altura-nav ja inclui o safe-area
 * do aparelho); no desktop a nav nao existe e ela desce.
 */
export function BarraSelecao({
  quantidade,
  sprints,
  onMover,
  onExcluir,
  onLimpar,
  ocupado = false,
}: BarraSelecaoProps) {
  if (quantidade === 0) return null;

  const destinos = sprints.filter((s) => s.status_sprint !== "concluida");

  return (
    <div
      role="region"
      aria-label="Acoes para as tarefas selecionadas"
      className="fixed left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-3 py-2 max-w-[calc(100vw-1.5rem)] bottom-[calc(var(--tf-altura-nav)+0.5rem)] lg:bottom-5"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border-strong)",
        borderRadius: "var(--tf-radius-md)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      }}
    >
      <span
        className="text-[12px] font-semibold whitespace-nowrap pl-1"
        style={{ color: "var(--tf-text)" }}
      >
        {quantidade} {quantidade === 1 ? "selecionada" : "selecionadas"}
      </span>

      <span
        aria-hidden="true"
        className="w-px h-5 shrink-0"
        style={{ background: "var(--tf-border)" }}
      />

      <Dropdown
        rotulo={`Mover ${quantidade} tarefa(s) para`}
        propsGatilho={{
          className:
            "flex items-center gap-1.5 h-8 px-2.5 text-[12px] font-semibold transition-colors hover:bg-[var(--tf-surface-hover)] disabled:opacity-40",
          style: { color: "var(--tf-text)", borderRadius: "var(--tf-radius-xs)" },
          disabled: ocupado,
        }}
        gatilho={
          <>
            {ocupado ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <MoveRight size={13} strokeWidth={1.75} />
            )}
            Mover
          </>
        }
      >
        <DropdownItem onClick={() => onMover(null)}>
          <Inbox size={12} strokeWidth={1.75} /> Sem sprint
        </DropdownItem>
        {destinos.map((s) => (
          <DropdownItem key={s.id} onClick={() => onMover(s.id)}>
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: s.cor }}
            />
            {s.nome}
          </DropdownItem>
        ))}
        {destinos.length === 0 && (
          <p
            className="px-2.5 py-1.5 text-[12px]"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            Nenhuma sprint aberta
          </p>
        )}
      </Dropdown>

      <button
        onClick={onExcluir}
        disabled={ocupado}
        className="flex items-center gap-1.5 h-8 px-2.5 text-[12px] font-semibold transition-colors disabled:opacity-40"
        style={{ color: "var(--tf-danger)", borderRadius: "var(--tf-radius-xs)" }}
      >
        <Trash2 size={13} strokeWidth={1.75} />
        Excluir
      </button>

      <button
        onClick={onLimpar}
        disabled={ocupado}
        aria-label="Limpar selecao"
        className="w-8 h-8 flex items-center justify-center transition-colors disabled:opacity-40"
        style={{ color: "var(--tf-text-tertiary)", borderRadius: "var(--tf-radius-xs)" }}
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
