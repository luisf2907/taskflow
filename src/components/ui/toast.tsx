"use client";

import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: { icon: "var(--tf-success)", bg: "var(--tf-success-bg)" },
  error: { icon: "var(--tf-danger)", bg: "var(--tf-danger-bg)" },
  info: { icon: "var(--tf-accent)", bg: "var(--tf-accent-light)" },
};

export function ToastContainer() {
  const { toasts, remove } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5"
      style={{ maxWidth: 380 }}
    >
      {toasts.map((t) => {
        const Icon = icons[t.type];
        const color = colors[t.type];

        return (
          <div
            key={t.id}
            className="flex items-start gap-3 px-4 py-3.5 rounded-[14px] border animate-in"
            style={{
              background: "var(--tf-surface)",
              borderColor: "var(--tf-border)",
              boxShadow: "var(--tf-shadow-md)",
              animation: "toast-in 300ms cubic-bezier(0.25, 1, 0.5, 1)",
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: color.bg }}
            >
              <Icon size={14} style={{ color: color.icon }} strokeWidth={2.5} />
            </div>
            <p
              className="text-[13px] font-medium flex-1 leading-relaxed pt-1"
              style={{ color: "var(--tf-text)" }}
            >
              {t.message}
            </p>
            <button
              onClick={() => remove(t.id)}
              className="p-1 rounded-[4px] shrink-0 mt-0.5 hover:bg-[var(--tf-surface-hover)]"
              style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
