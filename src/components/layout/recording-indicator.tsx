"use client";

import { useRecording } from "@/hooks/use-recording";
import { Maximize2, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { springSoft } from "@/lib/motion/presets";

function formatTime(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return "0:00";
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Indicador flutuante que aparece quando uma gravação de reunião está em
 * andamento e o modal está fechado. Permite parar ou reabrir o modal.
 */
export function RecordingIndicator() {
  const { phase, elapsedMs, modalOpen, openModal, stopRecording } = useRecording();

  // Só aparece quando está gravando E o modal está fechado
  const visivel = phase === "recording" && !modalOpen;

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={springSoft}
          className="fixed bottom-5 right-5 z-[9000] flex items-center gap-2.5 h-10 px-3"
          style={{
            background: "var(--tf-surface-raised)",
            border: "1px solid var(--tf-danger)",
            borderLeft: "3px solid var(--tf-danger)",
            borderRadius: "var(--tf-radius-md)",
            boxShadow: "var(--tf-shadow-lg)",
          }}
          role="status"
          aria-live="polite"
        >
          {/* Ponto pulsando vermelho */}
          <span
            className="w-2 h-2 pulse-dot"
            style={{
              background: "var(--tf-danger)",
              borderRadius: "1px",
            }}
          />

          {/* Label */}
          <span
            className="text-[0.6875rem] font-medium"
            style={{
              color: "var(--tf-text-secondary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Gravando
          </span>

          {/* Tempo */}
          <span
            className="text-[0.75rem] font-medium"
            style={{
              color: "var(--tf-text)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.02em",
              minWidth: 38,
            }}
          >
            {formatTime(elapsedMs)}
          </span>

          <div
            className="w-px h-5 mx-1"
            style={{ background: "var(--tf-border)" }}
            aria-hidden
          />

          {/* Stop */}
          <button
            onClick={() => {
              stopRecording().then(() => {
                openModal(); // ao parar, reabre modal pra finalizar
              });
            }}
            aria-label="Parar gravação"
            title="Parar gravação"
            className="w-7 h-7 flex items-center justify-center transition-colors hover:brightness-110"
            style={{
              background: "var(--tf-danger)",
              color: "#FFFFFF",
              border: "1px solid var(--tf-danger)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <Square size={10} strokeWidth={2} fill="white" />
          </button>

          {/* Expandir / reabrir modal */}
          <button
            onClick={openModal}
            aria-label="Expandir janela de gravação"
            title="Abrir janela"
            className="w-7 h-7 flex items-center justify-center transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-text)]"
            style={{
              color: "var(--tf-text-tertiary)",
              borderRadius: "var(--tf-radius-xs)",
            }}
          >
            <Maximize2 size={12} strokeWidth={1.75} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
