import type { Quadro } from "@/types";
import type { CartaoBacklog } from "@/hooks/use-backlog";

/**
 * Gera um path SVG curvo (Bezier) entre dois pontos para desenhar setas
 * de dependencia entre sprints.
 */
export function renderDependencyPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): string {
  const dx = Math.max(20, Math.abs(toX - fromX) / 2);
  return `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;
}

/**
 * Calcula o percentual de cards concluidos de uma sprint.
 * Usa o nome da coluna ("conclu" ou "done") para identificar.
 */
export function progressoSprint(
  sprint: Quadro,
  cartoesDaSprint: (quadroId: string) => CartaoBacklog[]
): number {
  const cards = cartoesDaSprint(sprint.id);
  if (cards.length === 0) return 0;
  const concluidos = cards.filter(
    (c) =>
      c.coluna_nome?.toLowerCase().includes("conclu") ||
      c.coluna_nome?.toLowerCase().includes("done")
  ).length;
  return Math.round((concluidos / cards.length) * 100);
}
