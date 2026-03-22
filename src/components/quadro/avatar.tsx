"use client";

import { cn } from "@/lib/utils";
import { Membro } from "@/types";

interface AvatarProps {
  membro: Membro;
  tamanho?: "sm" | "md" | "lg";
  className?: string;
}

const TAMANHOS = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

const TAMANHOS_PX = {
  sm: 28,
  md: 32,
  lg: 40,
};

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}

export function Avatar({ membro, tamanho = "md", className }: AvatarProps) {
  const temFoto = !!membro.avatar_url;

  if (temFoto) {
    return (
      <img
        src={membro.avatar_url!}
        alt={membro.nome}
        title={membro.nome}
        width={TAMANHOS_PX[tamanho]}
        height={TAMANHOS_PX[tamanho]}
        className={cn(
          "rounded-full shrink-0 object-cover",
          TAMANHOS[tamanho],
          className
        )}
        style={{
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white shrink-0",
        TAMANHOS[tamanho],
        className
      )}
      style={{
        backgroundColor: membro.cor_avatar,
      }}
      title={membro.nome}
    >
      {getIniciais(membro.nome)}
    </div>
  );
}

interface GrupoAvatarProps {
  membros: Membro[];
  max?: number;
  tamanho?: "sm" | "md" | "lg";
}

export function GrupoAvatar({ membros, max = 3, tamanho = "sm" }: GrupoAvatarProps) {
  const visiveis = membros.slice(0, max);
  const restante = membros.length - max;

  return (
    <div className="flex -space-x-1.5">
      {visiveis.map((membro) => (
        <Avatar key={membro.id} membro={membro} tamanho={tamanho} />
      ))}
      {restante > 0 && (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-bold text-white shrink-0",
            TAMANHOS[tamanho]
          )}
          style={{
            background: "var(--tf-text-tertiary)",
          }}
        >
          +{restante}
        </div>
      )}
    </div>
  );
}
