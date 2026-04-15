"use client";

import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

import { layoutSpring } from "@/lib/motion/presets";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";

// ────────────────────────────────────────────────
// SegmentedControl — switcher animado com sliding indicator
// Abordagem: indicator persistente medido via offsetLeft/offsetWidth.
// Anima so x e width (Y fixo) — zero chance de trajetoria diagonal.
// ────────────────────────────────────────────────

type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
}>;

export interface SegmentedControlItem<T extends string> {
  id: T;
  label: string;
  icon?: IconComponent;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  items: readonly SegmentedControlItem<T>[];
  value: T;
  onChange: (v: T) => void;
  variant?: "pill" | "underline";
  size?: "sm" | "md";
  fullWidth?: boolean;
  monoCaps?: boolean;
  className?: string;
  "aria-label"?: string;
}

const heightBySize = {
  sm: "h-7",
  md: "h-9",
};

const textSizeBySize = {
  sm: "text-[0.6875rem]",
  md: "text-[0.75rem]",
};

export function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  variant = "pill",
  size = "sm",
  fullWidth = false,
  monoCaps = false,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const reduceMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Map<T, HTMLButtonElement>>(new Map());

  // `null` ate primeira medicao — evita indicator aparecer em (0,0) antes de medir.
  const [indicator, setIndicator] = useState<{ x: number; width: number } | null>(
    null,
  );

  // Mede a posicao do botao ativo usando offsetLeft/Width (layout real, sem
  // influencia de transforms do whileTap). Re-mede em resize do container.
  useLayoutEffect(() => {
    function measure() {
      const btn = buttonsRef.current.get(value);
      if (!btn) return;
      setIndicator({ x: btn.offsetLeft, width: btn.offsetWidth });
    }
    measure();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  }, [value, items]);

  const containerStyle: React.CSSProperties =
    variant === "pill"
      ? {
          background: "var(--tf-bg-secondary)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-xs)",
        }
      : {
          borderBottom: "1px solid var(--tf-border)",
        };

  const containerClass =
    variant === "pill"
      ? "relative flex shrink-0 p-0.5"
      : "relative flex gap-0.5";

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={[containerClass, className].filter(Boolean).join(" ")}
      style={containerStyle}
    >
      {/* Indicator — sempre presente, anima x/width. Altura fixa, sem Y. */}
      {indicator && variant === "pill" && (
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: indicator.x, width: indicator.width }}
          transition={reduceMotion ? { duration: 0 } : layoutSpring}
          style={{
            position: "absolute",
            top: 2, // p-0.5 = 2px
            bottom: 2,
            left: 0,
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            pointerEvents: "none",
          }}
        />
      )}
      {indicator && variant === "underline" && (
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: indicator.x, width: indicator.width }}
          transition={reduceMotion ? { duration: 0 } : layoutSpring}
          style={{
            position: "absolute",
            bottom: -1,
            left: 0,
            height: 2,
            background: "var(--tf-accent)",
            borderRadius: "1px 1px 0 0",
            pointerEvents: "none",
          }}
        />
      )}

      {items.map(({ id, label, icon: Icon, count }) => {
        const ativo = value === id;
        return (
          <motion.button
            key={id}
            ref={(el) => {
              if (el) buttonsRef.current.set(id, el);
              else buttonsRef.current.delete(id);
            }}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(id)}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            className={[
              "relative flex items-center justify-center gap-1.5 font-medium outline-none",
              heightBySize[size],
              textSizeBySize[size],
              variant === "pill" ? "px-2.5" : "px-3.5",
              fullWidth ? "flex-1" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              color: ativo
                ? variant === "underline"
                  ? "var(--tf-accent-text)"
                  : "var(--tf-text)"
                : "var(--tf-text-tertiary)",
              fontFamily: monoCaps ? "var(--tf-font-mono)" : undefined,
              letterSpacing: monoCaps ? "0.02em" : "-0.005em",
              textTransform: monoCaps ? "uppercase" : "none",
              fontWeight: variant === "underline" && ativo ? 600 : 500,
              transition: "color 160ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
          >
            {/* Conteudo acima do indicator (z-index via position relative) */}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon size={size === "sm" ? 12 : 14} strokeWidth={1.75} />}
              <span className={Icon ? "hidden sm:inline" : undefined}>{label}</span>
              {typeof count === "number" && count > 0 && (
                <span
                  className="text-[10px] font-semibold px-[5px]"
                  style={{
                    background: ativo
                      ? "var(--tf-accent-light)"
                      : "var(--tf-bg-secondary)",
                    color: ativo
                      ? "var(--tf-accent-text)"
                      : "var(--tf-text-tertiary)",
                    borderRadius: "var(--tf-radius-xs)",
                    transition:
                      "background-color 160ms cubic-bezier(0.32, 0.72, 0, 1), color 160ms cubic-bezier(0.32, 0.72, 0, 1)",
                  }}
                >
                  {count}
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
