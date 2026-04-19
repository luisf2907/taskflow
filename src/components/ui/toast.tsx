"use client";

import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Info, X, PartyPopper } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { springSoft } from "@/lib/motion/presets";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  done: PartyPopper,
};

const colors = {
  success: { icon: "var(--tf-success)", border: "var(--tf-success)" },
  error: { icon: "var(--tf-danger)", border: "var(--tf-danger)" },
  info: { icon: "var(--tf-accent)", border: "var(--tf-accent)" },
  done: { icon: "var(--tf-accent)", border: "var(--tf-accent)" },
};

/**
 * Particulas de celebracao para toast "done".
 * 10 pontos explodem radialmente em cores variadas.
 */
function ConfettiBurst() {
  const particles = [
    { x: -40, y: -30, color: "var(--tf-accent)", delay: 0 },
    { x: 40, y: -40, color: "var(--tf-success)", delay: 0.05 },
    { x: -55, y: 0, color: "var(--tf-accent-yellow)", delay: 0.1 },
    { x: 55, y: -10, color: "var(--tf-accent)", delay: 0.15 },
    { x: -30, y: 30, color: "var(--tf-success)", delay: 0.08 },
    { x: 30, y: 40, color: "var(--tf-accent-yellow)", delay: 0.12 },
    { x: -60, y: -50, color: "var(--tf-accent)", delay: 0.2 },
    { x: 60, y: 30, color: "var(--tf-success)", delay: 0.18 },
    { x: 0, y: -55, color: "var(--tf-accent-yellow)", delay: 0.22 },
    { x: 0, y: 50, color: "var(--tf-accent)", delay: 0.25 },
  ];

  return (
    <div
      aria-hidden
      className="absolute pointer-events-none"
      style={{ left: 20, top: 18, width: 0, height: 0 }}
    >
      {particles.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: 1, opacity: 0 }}
          transition={{
            duration: 0.9,
            delay: p.delay,
            ease: [0.32, 0.72, 0, 1],
          }}
          className="absolute"
          style={{
            width: i % 3 === 0 ? 6 : 4,
            height: i % 3 === 0 ? 6 : 4,
            background: p.color,
            borderRadius: i % 2 === 0 ? "50%" : "1px",
          }}
        />
      ))}
    </div>
  );
}

export function ToastContainer() {
  const { toasts, remove } = useToast();

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 380 }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          const color = colors[t.type];
          const isDone = t.type === "done";

          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 32, scale: 0.96 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: isDone ? [0.96, 1.04, 1] : 1,
              }}
              exit={{
                opacity: 0,
                x: 32,
                scale: 0.96,
                transition: { duration: 0.15 },
              }}
              transition={isDone ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : springSoft}
              className="relative flex items-start gap-3 px-3.5 py-3 pointer-events-auto"
              style={{
                background: "var(--tf-surface-raised)",
                border: "1px solid var(--tf-border)",
                borderLeft: `2px solid ${color.border}`,
                borderRadius: "var(--tf-radius-md)",
                boxShadow: "var(--tf-shadow-lg)",
              }}
            >
              {isDone && <ConfettiBurst />}
              <Icon
                size={isDone ? 16 : 14}
                style={{ color: color.icon }}
                strokeWidth={2.25}
                className="mt-0.5 shrink-0"
              />
              <p
                className="text-[0.8125rem] flex-1 leading-snug"
                style={{ color: "var(--tf-text)" }}
              >
                {t.message}
              </p>
              <button
                onClick={() => remove(t.id)}
                aria-label="Fechar"
                className="p-0.5 shrink-0 mt-0.5 transition-colors hover:text-[var(--tf-text)]"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
