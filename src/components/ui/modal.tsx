"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface ModalProps {
  aberto: boolean;
  onFechar: () => void;
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ aberto, onFechar, titulo, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus trap: cycle Tab within the modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onFechar();
        return;
      }

      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [role="button"]:not([disabled]), [role="menuitem"], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onFechar]
  );

  // Register keyboard handler
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

  // Auto-focus only on initial open (not on re-renders)
  useEffect(() => {
    if (aberto) {
      requestAnimationFrame(() => {
        const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      });
    }
     
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center py-[5vh] bg-black/50 backdrop-blur-sm overflow-y-auto"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onFechar(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo || "Modal"}
        className={cn("rounded-[32px] w-full max-w-lg mx-4 border my-auto", className)}
        style={{
          background: "var(--tf-surface)",
          borderColor: "var(--tf-border)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {titulo && (
          <div
            className="flex items-center justify-between px-6 py-4 border-b shrink-0"
            style={{ borderColor: "var(--tf-border)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "var(--tf-text)" }}>{titulo}</h2>
            <button
              onClick={onFechar}
              aria-label="Fechar modal"
              className="p-1 rounded-[8px] transition-smooth"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>{children}</div>
      </div>
    </div>
  );
}
