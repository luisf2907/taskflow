"use client";

import { useTema } from "@/hooks/use-tema";
import { Kanban, Moon, Sun } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { tema, alternar } = useTema();

  return (
    <header
      className="h-12 flex items-center justify-between px-4 shrink-0 border-b"
      style={{
        background: "var(--tf-header)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 group"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--tf-accent)" }}
        >
          <Kanban size={15} className="text-white" />
        </div>
        <span
          className="text-[15px] font-bold tracking-tight"
          style={{ color: "var(--tf-header-text)" }}
        >
          Taskflow
        </span>
      </Link>

      <button
        onClick={alternar}
        className="p-2 rounded-lg transition-smooth"
        style={{ color: "var(--tf-text-tertiary)" }}
        title={tema === "claro" ? "Modo escuro" : "Modo claro"}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {tema === "claro" ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    </header>
  );
}
