"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModalProps {
  aberto: boolean;
  onFechar: () => void;
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ aberto, onFechar, titulo, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) { if (e.key === "Escape") onFechar(); }
    if (aberto) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center py-[5vh] bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === overlayRef.current) onFechar(); }}
    >
      <div
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
