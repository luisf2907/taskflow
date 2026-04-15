"use client";

import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { springSoft } from "@/lib/motion/presets";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: { icon: "var(--tf-success)", border: "var(--tf-success)" },
  error: { icon: "var(--tf-danger)", border: "var(--tf-danger)" },
  info: { icon: "var(--tf-accent)", border: "var(--tf-accent)" },
};

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

          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 32, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 32, scale: 0.96, transition: { duration: 0.15 } }}
              transition={springSoft}
              className="flex items-start gap-3 px-3.5 py-3 pointer-events-auto"
              style={{
                background: "var(--tf-surface-raised)",
                border: "1px solid var(--tf-border)",
                borderLeft: `2px solid ${color.border}`,
                borderRadius: "var(--tf-radius-md)",
                boxShadow: "var(--tf-shadow-lg)",
              }}
            >
              <Icon size={14} style={{ color: color.icon }} strokeWidth={2.25} className="mt-0.5 shrink-0" />
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
