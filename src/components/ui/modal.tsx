"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { fadeOnly, scaleIn } from "@/lib/motion/presets";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
  // Arraste so no mobile: no desktop a folha e um dialogo centralizado e
  // arrastar nao significa nada. Nada aqui muda o desktop.
  const isMobile = useIsMobile();
  const controlesArraste = useDragControls();

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

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          ref={overlayRef}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeOnly}
          className="fixed inset-0 z-50 flex items-end md:items-start justify-center p-0 md:py-[5vh] overflow-y-auto"
          style={{
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          onMouseDown={(e) => {
            if (e.target === overlayRef.current) onFechar();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={titulo || "Modal"}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={scaleIn}
            // ═══════════════════════════════════════════════════════════
            // Arrastar para fechar — so no mobile
            // ═══════════════════════════════════════════════════════════
            // O puxador ja existia, mas era DESENHO: nao arrastava nada.
            // Afordancia que nao cumpre o que promete e pior que afordancia
            // nenhuma, e arrastar a folha para baixo e o gesto padrao para
            // dispensar no iOS e no One UI.
            //
            // dragListener={false} + dragControls: o arraste comeca SO pelo
            // puxador. Se a folha inteira fosse arrastavel, rolar o
            // conteudo dispensaria o modal sem querer.
            //
            // dragElastic assimetrico: para baixo cede (0.4), para cima
            // trava (0). A folha nasce colada no fundo da tela — deixar
            // subir revelaria uma faixa vazia embaixo dela.
            drag={isMobile ? "y" : false}
            dragControls={controlesArraste}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_evento, info) => {
              // Fecha por DISTANCIA ou por VELOCIDADE. So distancia obrigaria
              // um arrasto longo; so velocidade ignoraria quem puxa devagar
              // ate embaixo. As duas juntas e o que o gesto nativo faz.
              if (info.offset.y > 120 || info.velocity.y > 600) onFechar();
            }}
            className={cn(
              "w-full max-w-lg mx-0 md:mx-4 my-0 md:my-auto",
              // Cantos maiores no mobile (16px contra os 10px do
              // --tf-radius-lg): a folha e um objeto que sobe por cima da
              // tela, mesma classe da capsula da barra de navegacao. No
              // desktop segue --tf-radius-lg, inalterado.
              "rounded-t-2xl md:rounded-[var(--tf-radius-lg)]",
              "border-t md:border",
              "flex flex-col max-h-[90dvh] md:max-h-[90vh]",
              className
            )}
            style={{
              background: "var(--tf-surface)",
              borderColor: "var(--tf-border)",
              boxShadow: "var(--tf-shadow-lg)",
              // Respira acima da home indicator. No desktop o env() e 0.
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Puxador. touch-none impede o navegador de sequestrar o gesto
                para rolagem antes de o motion recebe-lo. A area de toque e
                a faixa inteira, nao o risquinho de 4px. */}
            <div
              onPointerDown={(e) => controlesArraste.start(e)}
              className="md:hidden flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing touch-none"
            >
              <span
                aria-hidden
                className="w-9 h-1 rounded-full"
                style={{ background: "var(--tf-border-strong)" }}
              />
            </div>
            {titulo && (
              <div
                className="flex items-center justify-between px-5 py-3 md:py-3.5 border-b shrink-0"
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
                  aria-label="Fechar modal"
                  className="p-1 rounded-[var(--tf-radius-xs)] transition-smooth hover:bg-[var(--tf-surface-hover)]"
                  style={{ color: "var(--tf-text-tertiary)" }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="p-5 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
