// =============================================================================
// Helpers de data compartilhados
// -----------------------------------------------------------------------------
// Centraliza utilidades de data antes duplicadas em:
//   - src/components/workspace/timeline/
//   - src/components/workspace/metricas/
//   - src/app/workspace/[id]/page.tsx
// =============================================================================

/**
 * Diferenca em dias entre duas datas, arredondando para o inteiro mais proximo.
 * Usado pelo Gantt/timeline onde precisao de "dia" e suficiente.
 */
export function diasEntreRound(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Diferenca em dias entre duas datas, arredondando para cima.
 * Usado pelas metricas (duracao da sprint, etc).
 */
export function diasEntreCeil(d1: Date, d2: Date): number {
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Formata uma Date como "01 jan" (pt-BR, sem ponto).
 */
export function formatarDataCurta(d: Date): string {
  return d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    .replace(".", "");
}

/**
 * Formata uma string ISO (YYYY-MM-DD) como "01 jan", retornando "—" se nula.
 * Usa T00:00:00 para evitar shift de timezone.
 */
export function formatarDataISO(data: string | null): string {
  if (!data) return "—";
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Formata o mes abreviado em pt-BR (sem ponto). Ex: "jan", "fev".
 */
export function formatarMes(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

/**
 * Retorna nova Date com N dias adicionados (nao muta a original).
 */
export function adicionarDias(d: Date, dias: number): Date {
  const novo = new Date(d);
  novo.setDate(novo.getDate() + dias);
  return novo;
}

/**
 * Converte Date para string ISO YYYY-MM-DD (sem time/timezone).
 */
export function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Quantos dias faltam ate a dataFim (string ISO). Negativo se passou.
 * Retorna null se dataFim for nula.
 */
export function diasRestantes(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const diff = new Date(dataFim).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
