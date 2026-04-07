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
      className="group text-left rounded-[32px] overflow-hidden p-6 relative flex flex-col transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 min-w-[260px] max-w-[300px] flex-shrink-0 snap-start"
      style={{
        background: `linear-gradient(135deg, ${quadro.cor}, ${quadro.cor}dd)`,
      }}
    >
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.04] transition-colors duration-300" />
      <div className="relative z-10 w-full">
        <div className="flex justify-between items-start mb-3">
          <div className="w-10 h-10 rounded-[14px] bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Grid3X3 size={20} className="text-white" />
          </div>
        </div>
        <h3 className="text-white font-extrabold text-[17px] leading-tight line-clamp-2 tracking-tight drop-shadow-sm">
          {quadro.nome}
        </h3>
      </div>

      <div className="relative z-10 flex items-center justify-between w-full mt-4">
        <p className="text-white/85 text-[12px] font-bold flex items-center gap-1.5 backdrop-blur-sm bg-black/10 px-3 py-1.5 rounded-full">
          <Clock size={12} />
          {new Date(quadro.atualizado_em).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })}
        </p>
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
          <ArrowRight size={14} className="text-white" />
        </div>
      </div>
    </button>
  );
}
