// =============================================
// Paleta curada de épicos — 8 cores muted.
// Distintas das tipicas vivid de etiquetas, pra não confundir visualmente.
// =============================================
export interface CorEpico {
  id: string;
  nome: string;
  hex: string;
}

export const PALETA_EPICOS: readonly CorEpico[] = [
  { id: "slate", nome: "Slate", hex: "#6B7BB3" },
  { id: "olive", nome: "Oliva", hex: "#8C9A6E" },
  { id: "sienna", nome: "Terracota", hex: "#C77E5C" },
  { id: "plum", nome: "Ameixa", hex: "#8E6A99" },
  { id: "teal", nome: "Teal", hex: "#5E8B95" },
  { id: "mustard", nome: "Mostarda", hex: "#B5965A" },
  { id: "ash", nome: "Cinza", hex: "#8E8E8E" },
  { id: "rose", nome: "Rosa", hex: "#B57489" },
] as const;

/** Limite de épicos ativos (não-concluídos) por workspace — força disciplina. */
export const LIMITE_EPICOS_ATIVOS = 8;

/** Retorna a próxima cor disponível, dado um set de cores já usadas. */
export function proximaCorDisponivel(usadas: string[]): string {
  const set = new Set(usadas.map((c) => c.toLowerCase()));
  for (const cor of PALETA_EPICOS) {
    if (!set.has(cor.hex.toLowerCase())) return cor.hex;
  }
  // Se todas já foram usadas, repete a primeira (limite de 8 evita esse caso na prática)
  return PALETA_EPICOS[0].hex;
}

/** Retorna o objeto CorEpico de um hex (ou null se não estiver na paleta). */
export function corEpicoPorHex(hex: string | null): CorEpico | null {
  if (!hex) return null;
  const lc = hex.toLowerCase();
  return PALETA_EPICOS.find((c) => c.hex.toLowerCase() === lc) || null;
}
