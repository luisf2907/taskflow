"use client";

import { useEffect, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";

export function AparenciaSection() {
  const [tema, setTema] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTema(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  function toggleTema(t: "light" | "dark") {
    setTema(t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette size={14} style={{ color: "var(--tf-accent)" }} />
        <h2
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Aparência
        </h2>
      </div>

      <div
        className="rounded-[20px] p-6"
        style={{ background: "var(--tf-bg-secondary)" }}
      >
        <div className="flex gap-3">
          {(
            [
              { id: "light" as const, label: "Claro", icon: Sun },
              { id: "dark" as const, label: "Escuro", icon: Moon },
            ]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => toggleTema(id)}
              className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-[14px] text-[13px] font-semibold transition-all duration-150"
              style={{
                background: tema === id ? "var(--tf-surface)" : "transparent",
                color: tema === id ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                border:
                  tema === id
                    ? "1px solid var(--tf-border)"
                    : "1px solid transparent",
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
