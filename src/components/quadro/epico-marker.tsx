"use client";

import { corEpicoPorHex } from "@/lib/epicos";

interface EpicoMarkerProps {
  /** Cor hex do épico (próprio ou herdada do pai). */
  cor: string | null;
  /** Título do épico, mostrado no tooltip. */
  titulo: string | null;
  /** Se true, é o próprio épico (não filho) — bolinha tem anel mais forte. */
  enfase?: boolean;
  /** Tamanho da bolinha em px. Default 10. */
  tamanho?: number;
}

/** Bolinha que marca um card como pertencendo a um épico. */
export function EpicoMarker({
  cor,
  titulo,
  enfase = false,
  tamanho = 10,
}: EpicoMarkerProps) {
  if (!cor) return null;
  const corInfo = corEpicoPorHex(cor);
  const nomePaleta = corInfo?.nome || "";

  return (
    <span
      role="img"
      aria-label={titulo ? `Épico: ${titulo}` : "Marcador de épico"}
      title={titulo ? `Épico: ${titulo}${nomePaleta ? ` · ${nomePaleta}` : ""}` : "Épico"}
      className="inline-block shrink-0"
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: "50%",
        background: cor,
        // Quando é o próprio épico, anel duplo (interior branco + outline da cor)
        boxShadow: enfase
          ? `0 0 0 1.5px var(--tf-surface), 0 0 0 2.5px ${cor}`
          : `0 0 0 1px rgba(255,255,255,0.4)`,
      }}
    />
  );
}
