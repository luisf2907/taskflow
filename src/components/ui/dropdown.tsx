"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Dropdown({ trigger, children, className }: DropdownProps) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setAberto(!aberto)}>{trigger}</div>
      {aberto && (
        <div
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
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-smooth rounded-[8px] mx-1",
        className
      )}
      style={{
        color: perigo ? "var(--tf-danger)" : "var(--tf-text)",
        width: "calc(100% - 8px)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = perigo ? "var(--tf-danger-bg)" : "var(--tf-surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
