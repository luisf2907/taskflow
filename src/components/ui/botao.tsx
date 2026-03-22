"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "secundario" | "fantasma" | "perigo";
  tamanho?: "sm" | "md" | "lg";
}

const Botao = forwardRef<HTMLButtonElement, BotaoProps>(
  ({ className, variante = "primario", tamanho = "md", style, ...props }, ref) => {
    const estilos: Record<string, React.CSSProperties> = {
      primario: { background: "var(--tf-accent)", color: "#fff" },
      secundario: { background: "var(--tf-bg-secondary)", color: "var(--tf-text)", border: "1px solid var(--tf-border)" },
      fantasma: { color: "var(--tf-text-secondary)" },
      perigo: { background: "var(--tf-danger)", color: "#fff" },
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[8px] font-medium transition-smooth cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
          {
            "text-xs px-3 py-1.5": tamanho === "sm",
            "text-sm px-4 py-2": tamanho === "md",
            "text-base px-5 py-2.5": tamanho === "lg",
          },
          className
        )}
        style={{ ...estilos[variante], ...style }}
        {...props}
      />
    );
  }
);

Botao.displayName = "Botao";
export { Botao };
