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
      setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 - 65 });
    }
    setAberto(!aberto);
  }

  function handleExport(tipo: "csv" | "json") {
    if (tipo === "csv") exportCSV(cartoes, `${nomeWorkspace}-export.csv`);
    else exportJSON(cartoes, `${nomeWorkspace}-export.json`);
    setAberto(false);
  }

  useEffect(() => {
    if (!aberto) return;
    function handleClickFora(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
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
        className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[0.6875rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
        style={{
          border: "1px solid var(--tf-border)",
          color: "var(--tf-text-secondary)",
          background: "var(--tf-surface)",
          borderRadius: "var(--tf-radius-xs)",
          fontFamily: "var(--tf-font-mono)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <Download size={12} strokeWidth={1.75} /> Exportar
      </button>

      {aberto &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[70] overflow-hidden py-1"
            style={{
              top: pos.top,
              left: pos.left,
              width: 140,
              background: "var(--tf-surface-raised)",
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-md)",
              boxShadow: "var(--tf-shadow-md)",
            }}
          >
            <div
              className="label-mono px-3 py-1.5"
              style={{
                color: "var(--tf-text-tertiary)",
                borderBottom: "1px solid var(--tf-border)",
                marginBottom: 4,
              }}
            >
              Exportar como
            </div>
            <button
              onClick={() => handleExport("csv")}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[0.8125rem] transition-colors outline-none mx-1"
              style={{
                color: "var(--tf-text)",
                width: "calc(100% - 8px)",
                borderRadius: "var(--tf-radius-xs)",
                letterSpacing: "-0.005em",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--tf-surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={{ fontFamily: "var(--tf-font-mono)", fontSize: "0.75rem" }}>
                CSV
              </span>
              <span
                className="ml-auto text-[0.625rem]"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.02em",
                }}
              >
                planilha
              </span>
            </button>
            <button
              onClick={() => handleExport("json")}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-[0.8125rem] transition-colors outline-none mx-1"
              style={{
                color: "var(--tf-text)",
                width: "calc(100% - 8px)",
                borderRadius: "var(--tf-radius-xs)",
                letterSpacing: "-0.005em",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--tf-surface-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={{ fontFamily: "var(--tf-font-mono)", fontSize: "0.75rem" }}>
                JSON
              </span>
              <span
                className="ml-auto text-[0.625rem]"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                  letterSpacing: "0.02em",
                }}
              >
                bruto
              </span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
