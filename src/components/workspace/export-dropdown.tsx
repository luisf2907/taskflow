"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { exportCSV, exportJSON } from "@/lib/export";
import type { CartaoBacklog } from "@/hooks/use-backlog";

interface ExportDropdownProps {
  cartoes: CartaoBacklog[];
  nomeWorkspace: string;
}

export function ExportDropdown({ cartoes, nomeWorkspace }: ExportDropdownProps) {
  const [aberto, setAberto] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function handleToggle() {
    if (!aberto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 - 65 });
    }
    setAberto(!aberto);
  }

  function handleExport(tipo: "csv" | "json") {
    if (tipo === "csv") exportCSV(cartoes, `${nomeWorkspace}-export.csv`);
    else exportJSON(cartoes, `${nomeWorkspace}-export.json`);
    setAberto(false);
  }

  // Close on click outside
  useEffect(() => {
    if (!aberto) return;
    function handleClickFora(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [aberto]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex items-center gap-2 px-4 py-3 text-[13px] font-bold rounded-[20px] border transition-all hover:-translate-y-0.5"
        style={{
          borderColor: "var(--tf-border)",
          color: "var(--tf-text-secondary)",
          background: "var(--tf-surface)",
        }}
      >
        <Download size={16} /> Exportar
      </button>

      {aberto &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed rounded-[14px] border z-[70] overflow-hidden py-1.5"
            style={{
              top: pos.top,
              left: pos.left,
              width: 130,
              background: "var(--tf-surface-raised)",
              borderColor: "var(--tf-border)",
              boxShadow: "var(--tf-shadow-md)",
            }}
          >
            <button
              onClick={() => handleExport("csv")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-smooth rounded-[8px] mx-1 outline-none"
              style={{ color: "var(--tf-text)", width: "calc(100% - 8px)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              CSV
            </button>
            <button
              onClick={() => handleExport("json")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-smooth rounded-[8px] mx-1 outline-none"
              style={{ color: "var(--tf-text)", width: "calc(100% - 8px)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--tf-surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              JSON
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
