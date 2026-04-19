"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion, PanInfo } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

type DrawerSide = "left" | "right" | "bottom";

interface DrawerProps {
  aberto: boolean;
  onFechar: () => void;
  lado?: DrawerSide;
  titulo?: string;
  children: React.ReactNode;
  className?: string;
  larguraMax?: string;
}

export function Drawer({
  aberto,
  onFechar,
  lado = "left",
  titulo,
  children,
  className,
  larguraMax,
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    },
    [onFechar]
  );

  useEffect(() => {
    if (aberto) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [aberto, handleKeyDown]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 80;
    if (lado === "left" && info.offset.x < -threshold) onFechar();
    if (lado === "right" && info.offset.x > threshold) onFechar();
    if (lado === "bottom" && info.offset.y > threshold) onFechar();
  };

  const initial =
    lado === "left" ? { x: "-100%" } : lado === "right" ? { x: "100%" } : { y: "100%" };
  const animate = lado === "bottom" ? { y: 0 } : { x: 0 };
  const dragAxis = lado === "bottom" ? "y" : "x";
  const dragConstraints =
    lado === "left"
      ? { left: -300, right: 0 }
      : lado === "right"
      ? { left: 0, right: 300 }
      : { top: 0, bottom: 300 };

  const posicao =
    lado === "left"
      ? "inset-y-0 left-0"
      : lado === "right"
      ? "inset-y-0 right-0"
      : "inset-x-0 bottom-0";

  const formato =
    lado === "bottom"
      ? "rounded-t-[var(--tf-radius-xl)] max-h-[85vh] w-full"
      : "h-full";

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50"
          style={{
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
          onMouseDown={(e) => {
            if (e.target === overlayRef.current) onFechar();
          }}
        >
          <motion.aside
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={titulo || "Drawer"}
            initial={initial}
            animate={animate}
            exit={initial}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag={dragAxis}
            dragConstraints={dragConstraints}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className={cn(
              "absolute flex flex-col overflow-hidden",
              posicao,
              formato,
              className
            )}
            style={{
              background: "var(--tf-surface)",
              borderInlineEnd:
                lado === "left" ? "1px solid var(--tf-border)" : undefined,
              borderInlineStart:
                lado === "right" ? "1px solid var(--tf-border)" : undefined,
              borderBlockStart:
                lado === "bottom" ? "1px solid var(--tf-border)" : undefined,
              maxWidth: larguraMax || (lado === "bottom" ? undefined : "min(86vw, 320px)"),
              width: lado === "bottom" ? "100%" : "100%",
              boxShadow: "var(--tf-shadow-lg)",
            }}
          >
            {lado === "bottom" && (
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <span
                  aria-hidden
                  className="w-10 h-1 rounded-full"
                  style={{ background: "var(--tf-border)" }}
                />
              </div>
            )}
            {titulo && (
              <div
                className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                style={{ borderColor: "var(--tf-border)" }}
              >
                <h2
                  className="text-[0.9375rem] font-semibold"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
                >
                  {titulo}
                </h2>
                <button
                  onClick={onFechar}
                  aria-label="Fechar"
                  className="w-10 h-10 -mr-2 flex items-center justify-center rounded-[var(--tf-radius-xs)] transition-colors hover:bg-[var(--tf-surface-hover)]"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {children}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
