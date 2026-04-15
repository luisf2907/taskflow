"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Clock, Grid3X3 } from "lucide-react";
import type { Quadro } from "@/types";

interface QuadroBentoCardProps {
  quadro: Quadro;
}

export function QuadroBentoCard({ quadro }: QuadroBentoCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/quadro/${quadro.id}`)}
      className="group text-left overflow-hidden p-4 relative flex flex-col transition-colors min-w-[240px] max-w-[280px] h-[140px] flex-shrink-0 snap-start"
      style={{
        background: quadro.cor,
        borderRadius: "var(--tf-radius-md)",
      }}
    >
      {/* Hover overlay — subtle dim */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.08] transition-colors" />

      <div className="relative z-10 flex justify-between items-start mb-2">
        <div
          className="w-8 h-8 flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Grid3X3 size={15} className="text-white" strokeWidth={1.75} />
        </div>
        <span
          className="text-[0.5625rem] font-medium text-white/80 px-1.5 h-[17px] inline-flex items-center"
          style={{
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Sprint
        </span>
      </div>

      <h3
        className="relative z-10 text-white font-semibold text-[0.9375rem] leading-tight line-clamp-2 mt-auto"
        style={{ letterSpacing: "-0.01em" }}
      >
        {quadro.nome}
      </h3>

      <div className="relative z-10 flex items-center justify-between w-full mt-2.5">
        <p
          className="text-white/80 text-[0.625rem] flex items-center gap-1"
          style={{
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
          }}
        >
          <Clock size={10} strokeWidth={1.75} />
          {new Date(quadro.atualizado_em).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </p>
        <div
          className="w-6 h-6 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <ArrowRight size={11} className="text-white" strokeWidth={1.75} />
        </div>
      </div>
    </button>
  );
}
