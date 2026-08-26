/**
 * Ponte para o modal de feedback.
 *
 * Mesmo motivo de `@/lib/pro`: os pontos de entrada so precisam disparar o
 * evento, e importar do modulo do modal puxaria o chunk dele pra dentro de
 * cada bundle — o oposto do lazy load que GlobalOverlays faz.
 */
export const EVENTO_MODAL_FEEDBACK = "open-modal-feedback";

export function abrirModalFeedback() {
  window.dispatchEvent(new Event(EVENTO_MODAL_FEEDBACK));
}

export const TIPOS_FEEDBACK = ["sugestao", "problema", "outro"] as const;

export type TipoFeedback = (typeof TIPOS_FEEDBACK)[number];

/** Espelha o CHECK de `feedbacks_mensagem_check` na migration 058. */
export const MENSAGEM_MIN = 3;
export const MENSAGEM_MAX = 2000;
