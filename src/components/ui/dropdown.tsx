"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { scaleIn } from "@/lib/motion/presets";

const DropdownContext = createContext<(() => void) | undefined>(undefined);

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  closeOnClick?: boolean;
}

export function Dropdown({ trigger, children, className, closeOnClick = true }: DropdownProps) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
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
