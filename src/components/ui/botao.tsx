"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "secundario" | "fantasma" | "perigo";
  tamanho?: "sm" | "md" | "lg";
}

/**
 * Botão do design system — tech-futurista sóbrio.
 * Radii pequenos (sm=2px, md=4px, lg=6px), alturas densas,
 * focus ring laranja, transitions discretas.
 */
const Botao = forwardRef<HTMLButtonElement, BotaoProps>(
  ({ className, variante = "primario", tamanho = "md", style, ...props }, ref) => {
    const estilos: Record<string, React.CSSProperties> = {
      primario: {
        background: "var(--tf-accent)",
        color: "#FFFFFF",
        border: "1px solid var(--tf-accent)",
      },
      secundario: {
        background: "transparent",
        color: "var(--tf-text)",
        border: "1px solid var(--tf-border-strong)",
      },
      fantasma: {
        background: "transparent",
        color: "var(--tf-text-secondary)",
        border: "1px solid transparent",
      },
      perigo: {
        background: "var(--tf-danger)",
        color: "#FFFFFF",
        border: "1px solid var(--tf-danger)",
      },
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-smooth cursor-pointer outline-none",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          "hover:brightness-110",
          {
            "text-[0.75rem] h-7 px-2.5 rounded-[var(--tf-radius-xs)]": tamanho === "sm",
            "text-[0.8125rem] h-9 px-3.5 rounded-[var(--tf-radius-sm)]": tamanho === "md",
            "text-[0.875rem] h-10 px-4 rounded-[var(--tf-radius-md)]": tamanho === "lg",
          },
          className
        )}
        style={{ ...estilos[variante], letterSpacing: "-0.005em", ...style }}
        {...props}
      />
    );
  }
);

Botao.displayName = "Botao";
export { Botao };
