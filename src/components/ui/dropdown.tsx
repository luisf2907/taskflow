"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { scaleIn } from "@/lib/motion/presets";

const DropdownContext = createContext<(() => void) | undefined>(undefined);

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  closeOnClick?: boolean;
  /** Renderiza o menu via React portal em document.body. Evita ser cortado
   *  por containers com overflow:hidden / clip-path. Default false. */
  portal?: boolean;
}

export function Dropdown({ trigger, children, className, closeOnClick = true, portal = false }: DropdownProps) {
  const [aberto, setAberto] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Posiciona o menu portal alinhado ao trigger.
  // set-state-in-effect intencional: precisamos do bounding rect do DOM,
  // só conhecido após o trigger renderizar.
  useLayoutEffect(() => {
    if (!portal || !aberto) return;
    const trigger = ref.current?.querySelector('[aria-haspopup]') as HTMLElement | null;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoords({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, [portal, aberto]);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      const target = e.target as Node;
      // Quando o menu é renderizado via portal, ref.current não contém o menu.
      // Por isso checamos tanto o trigger (ref) quanto o menu (menuRef).
      const dentroTrigger = ref.current?.contains(target);
      const dentroMenu = menuRef.current?.contains(target);
      if (!dentroTrigger && !dentroMenu) setAberto(false);
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!aberto) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setAberto(true);
          setTimeout(() => {
            const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
            items?.[0]?.focus();
          }, 0);
        }
        return;
      }

      const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
      if (!items?.length) return;

      const current = document.activeElement as HTMLElement;
      const idx = Array.from(items).indexOf(current as HTMLButtonElement);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          items[(idx + 1) % items.length]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length]?.focus();
          break;
        case "Escape":
          e.preventDefault();
          setAberto(false);
          (ref.current?.querySelector("[aria-haspopup]") as HTMLElement)?.focus();
          break;
        case "Home":
          e.preventDefault();
          items[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
      }
    },
    [aberto]
  );

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <div
        onClick={() => setAberto(!aberto)}
        role="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setAberto(!aberto);
            if (!aberto) {
              setTimeout(() => {
                const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
                items?.[0]?.focus();
              }, 0);
            }
          }
        }}
      >
        {trigger}
      </div>
      <AnimatePresence>
        {aberto && (
          portal && typeof document !== "undefined" ? (
            createPortal(
              <motion.div
                ref={menuRef}
                role="menu"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={scaleIn}
                className={cn(
                  "fixed min-w-[200px] py-1 z-[100] border",
                  "rounded-[var(--tf-radius-md)]",
                  className
                )}
                style={{
                  top: coords?.top ?? -9999,
                  right: coords?.right ?? -9999,
                  background: "var(--tf-surface-raised)",
                  borderColor: "var(--tf-border)",
                  boxShadow: "var(--tf-shadow-md)",
                  transformOrigin: "top right",
                }}
              >
                <DropdownContext.Provider value={closeOnClick ? () => setAberto(false) : undefined}>
                  {children}
                </DropdownContext.Provider>
              </motion.div>,
              document.body
            )
          ) : (
            <motion.div
              ref={menuRef}
              role="menu"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={scaleIn}
              className={cn(
                "absolute right-0 mt-1 min-w-[200px] py-1 z-50 border",
                "rounded-[var(--tf-radius-md)]",
                className
              )}
              style={{
                background: "var(--tf-surface-raised)",
                borderColor: "var(--tf-border)",
                boxShadow: "var(--tf-shadow-md)",
                transformOrigin: "top right",
              }}
            >
              <DropdownContext.Provider value={closeOnClick ? () => setAberto(false) : undefined}>
                {children}
              </DropdownContext.Provider>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  perigo?: boolean;
  className?: string;
}

export function DropdownItem({ children, onClick, perigo, className }: DropdownItemProps) {
  const closeDropdown = useContext(DropdownContext);
  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={() => {
        onClick?.();
        closeDropdown?.();
      }}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[0.8125rem] transition-smooth outline-none",
        "rounded-[var(--tf-radius-xs)] mx-1",
        className
      )}
      style={{
        color: perigo ? "var(--tf-danger)" : "var(--tf-text)",
        width: "calc(100% - 8px)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = perigo ? "var(--tf-danger-bg)" : "var(--tf-surface-hover)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      onFocus={(e) =>
        (e.currentTarget.style.background = perigo ? "var(--tf-danger-bg)" : "var(--tf-surface-hover)")
      }
      onBlur={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
