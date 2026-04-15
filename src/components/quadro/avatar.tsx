"use client";

import { cn } from "@/lib/utils";
import { Membro } from "@/types";
import { motion } from "motion/react";
import Image from "next/image";

import { duration, easeOutExpo, springSnappy } from "@/lib/motion/presets";

interface AvatarProps {
  membro: Membro;
  tamanho?: "sm" | "md" | "lg";
  className?: string;
}

// Avatar quadrado (estilo Linear/tech-futurista) com radii pequeno,
// em vez de círculo. Tipografia mono nas iniciais.
const TAMANHOS = {
  sm: "w-6 h-6 text-[0.625rem]",
  md: "w-7 h-7 text-[0.6875rem]",
  lg: "w-9 h-9 text-[0.8125rem]",
};

const TAMANHOS_PX = {
  sm: 24,
  md: 28,
  lg: 36,
};

function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length >= 2)
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}

export function Avatar({ membro, tamanho = "md", className }: AvatarProps) {
  const temFoto = !!membro.avatar_url;

  if (temFoto) {
    return (
      <Image
        src={membro.avatar_url!}
        alt={membro.nome}
        title={membro.nome}
        width={TAMANHOS_PX[tamanho]}
        height={TAMANHOS_PX[tamanho]}
        className={cn("shrink-0 object-cover", TAMANHOS[tamanho], className)}
        style={{ borderRadius: "var(--tf-radius-xs)" }}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center font-semibold text-white shrink-0",
        TAMANHOS[tamanho],
        className
      )}
      style={{
        backgroundColor: membro.cor_avatar,
        borderRadius: "var(--tf-radius-xs)",
        fontFamily: "var(--tf-font-mono)",
        letterSpacing: "0.02em",
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

// Variants locais — avatar entra com scale + fade (feeling "pop"),
// ligeiramente mais dramatico que fadeUp pra valorizar pessoas.
const avatarStagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
};

const avatarPop = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springSnappy,
  },
};

const avatarFade = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.fast, ease: easeOutExpo },
  },
};

export function GrupoAvatar({
  membros,
  max = 3,
  tamanho = "sm",
}: GrupoAvatarProps) {
  const visiveis = membros.slice(0, max);
  const restante = membros.length - max;

  return (
    <motion.div
      className="flex -space-x-1"
      variants={avatarStagger}
      initial="hidden"
      animate="visible"
    >
      {visiveis.map((membro) => (
        <motion.div
          key={membro.id}
          variants={avatarPop}
          style={{
            outline: "2px solid var(--tf-surface)",
            borderRadius: "var(--tf-radius-xs)",
          }}
        >
          <Avatar membro={membro} tamanho={tamanho} />
        </motion.div>
      ))}
      {restante > 0 && (
        <motion.div
          variants={avatarFade}
          className={cn(
            "flex items-center justify-center font-semibold text-white shrink-0",
            TAMANHOS[tamanho]
          )}
          style={{
            background: "var(--tf-text-tertiary)",
            borderRadius: "var(--tf-radius-xs)",
            outline: "2px solid var(--tf-surface)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.02em",
          }}
        >
          +{restante}
        </motion.div>
      )}
    </motion.div>
  );
}
