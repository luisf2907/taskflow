"use client";

import { useRef, useState } from "react";
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
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setAberto(false)}
            />
            <div
              className="fixed rounded-[12px] border z-[70] overflow-hidden"
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
                className="block w-full px-4 py-2.5 text-[13px] font-semibold text-left"
                style={{
                  color: "var(--tf-text)",
                  borderBottom: "1px solid var(--tf-border-subtle)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--tf-surface-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="block w-full px-4 py-2.5 text-[13px] font-semibold text-left"
                style={{ color: "var(--tf-text)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--tf-surface-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                JSON
              </button>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
