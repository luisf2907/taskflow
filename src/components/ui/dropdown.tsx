"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Dropdown({ trigger, children, className }: DropdownProps) {
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!aberto) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setAberto(true);
        // Focus first item after opening
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
        (ref.current?.querySelector('[aria-haspopup]') as HTMLElement)?.focus();
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
  }, [aberto]);

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
      {aberto && (
        <div
          ref={menuRef}
          role="menu"
          className={cn("absolute right-0 mt-1 min-w-[180px] rounded-[14px] py-1.5 z-50 border", className)}
          style={{ background: "var(--tf-surface-raised)", borderColor: "var(--tf-border)" }}
        >
          <div onClick={() => setAberto(false)}>{children}</div>
        </div>
      )}
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
  return (
    <button
      role="menuitem"
      tabIndex={-1}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-smooth rounded-[8px] mx-1 outline-none",
        className
      )}
      style={{
        color: perigo ? "var(--tf-danger)" : "var(--tf-text)",
        width: "calc(100% - 8px)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = perigo ? "var(--tf-danger-bg)" : "var(--tf-surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      onFocus={(e) => (e.currentTarget.style.background = perigo ? "var(--tf-danger-bg)" : "var(--tf-surface-hover)")}
      onBlur={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
