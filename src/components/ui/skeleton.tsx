"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Altura em px ou via class. Ignorado se className tiver h-* */
  altura?: number;
  /** Largura fixa em px ou % (opcional) */
  largura?: number | string;
}

/**
 * Skeleton primitivo com shimmer sutil — usado em loading states
 * pra manter o layout da tela enquanto dados carregam.
 */
export function Skeleton({
  altura,
  largura,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn("tf-skeleton", className)}
      style={{
        height: altura ? `${altura}px` : undefined,
        width: typeof largura === "number" ? `${largura}px` : largura,
        ...style,
      }}
      aria-hidden
      {...props}
    />
  );
}

/**
 * Skeleton de um cartao do kanban. Preserva as proporcoes tipicas
 * de um Cartao real pra evitar layout shift quando carrega.
 */
export function CardSkeleton() {
  return (
    <div
      className="card-surface px-3.5 md:px-3 py-3 md:py-2.5 space-y-2"
      style={{ pointerEvents: "none" }}
    >
      <div className="flex gap-1">
        <Skeleton className="h-[14px] w-10 rounded-[var(--tf-radius-xs)]" />
        <Skeleton className="h-[14px] w-14 rounded-[var(--tf-radius-xs)]" />
      </div>
      <Skeleton className="h-[14px] w-[85%] rounded-[var(--tf-radius-xs)]" />
      <Skeleton className="h-[14px] w-[55%] rounded-[var(--tf-radius-xs)]" />
      <div className="flex items-center gap-1.5 pt-1">
        <Skeleton className="h-[15px] w-10 rounded-[var(--tf-radius-xs)]" />
        <Skeleton className="h-[15px] w-14 rounded-[var(--tf-radius-xs)]" />
        <div className="ml-auto flex -space-x-1">
          <Skeleton className="h-5 w-5 rounded-[var(--tf-radius-xs)]" />
          <Skeleton className="h-5 w-5 rounded-[var(--tf-radius-xs)]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton de uma coluna do kanban — header + 2-3 cartoes.
 */
export function ColumnSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="relative flex flex-col w-[86vw] min-w-[86vw] max-w-[86vw] md:w-[290px] md:min-w-[290px] md:max-w-[290px] shrink-0 max-h-full column-surface">
      <div className="flex items-center gap-1.5 px-3 pt-3 pb-2">
        <Skeleton className="h-[14px] w-24 rounded-[var(--tf-radius-xs)]" />
        <Skeleton className="h-[17px] w-5 rounded-[var(--tf-radius-xs)]" />
      </div>
      <div className="px-2 pb-3 space-y-1.5">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton do kanban inteiro — multiplas colunas.
 */
export function KanbanSkeleton({ colunas = 3 }: { colunas?: number }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden px-3 md:px-4 lg:px-6">
      <div className="flex gap-3 md:gap-4 items-start pt-1 overflow-hidden">
        {Array.from({ length: colunas }).map((_, i) => (
          <ColumnSkeleton key={i} cards={i === 0 ? 4 : i === 1 ? 3 : 2} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton de linha de lista (backlog, timeline, etc).
 */
export function ListRowSkeleton() {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-sm)",
      }}
    >
      <Skeleton className="h-4 w-4 rounded-[var(--tf-radius-xs)] shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-[13px] w-[60%] rounded-[var(--tf-radius-xs)]" />
        <div className="flex gap-1">
          <Skeleton className="h-[14px] w-10 rounded-[var(--tf-radius-xs)]" />
          <Skeleton className="h-[14px] w-14 rounded-[var(--tf-radius-xs)]" />
        </div>
      </div>
      <Skeleton className="h-[17px] w-16 rounded-[var(--tf-radius-xs)] shrink-0" />
      <Skeleton className="h-[17px] w-8 rounded-[var(--tf-radius-xs)] shrink-0" />
    </div>
  );
}
