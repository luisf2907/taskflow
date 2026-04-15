"use client";

import { useEffect, useState } from "react";
import { Moon, Palette, Sun } from "lucide-react";

export function AparenciaSection() {
  // Inicia com "light" no SSR e sincroniza no useEffect após hidratação pra
  // evitar hydration mismatch (o <html> pode ter `dark` aplicado pelo
  // theme-init.js antes da hidratação).
  const [tema, setTema] = useState<"light" | "dark">("light");

  // set-state-in-effect intencional: sync após hidratação.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTema(document.documentElement.classList.contains("dark") ? "dark" : "light");
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
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette
          size={12}
          strokeWidth={1.75}
          style={{ color: "var(--tf-accent)" }}
        />
        <h2 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
          Aparência
        </h2>
      </div>

      <div
        className="p-5"
        style={{
          background: "var(--tf-bg-secondary)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-md)",
        }}
      >
        <div className="flex gap-1.5">
          {(
            [
              { id: "light" as const, label: "Claro", icon: Sun },
              { id: "dark" as const, label: "Escuro", icon: Moon },
            ]
          ).map(({ id, label, icon: Icon }) => {
            const ativo = tema === id;
            return (
              <button
                key={id}
                onClick={() => toggleTema(id)}
                className="flex-1 flex items-center justify-center gap-2 h-10 text-[0.8125rem] font-medium transition-colors"
                style={{
                  background: ativo ? "var(--tf-surface)" : "transparent",
                  color: ativo ? "var(--tf-text)" : "var(--tf-text-tertiary)",
                  border: `1px solid ${ativo ? "var(--tf-accent)" : "var(--tf-border)"}`,
                  borderRadius: "var(--tf-radius-xs)",
                  letterSpacing: "-0.005em",
                }}
              >
                <Icon size={14} strokeWidth={1.75} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
