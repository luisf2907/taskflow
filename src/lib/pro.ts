/**
 * Ponte para o aviso de PRO.
 *
 * Fica separado de `components/pro/modal-pro` de proposito: os pontos de
 * entrada (header, detalhe do card, workspace) so precisam disparar o evento,
 * e importar do modulo do modal puxaria o chunk dele pra dentro de cada
 * bundle — o oposto do lazy load que GlobalOverlays faz.
 */
export const EVENTO_MODAL_PRO = "open-modal-pro";

export function abrirModalPro() {
  window.dispatchEvent(new Event(EVENTO_MODAL_PRO));
}

/**
 * Resposta 403 de `exigirPro` (src/lib/plano.ts). A UI usa isso pra abrir o
 * aviso de PRO em vez de mostrar um toast de erro generico — cobre o caso de
 * o plano mudar no meio da sessao, com a tela ainda achando que e PRO.
 */
export function ehErroDePlano(payload: unknown): boolean {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { codigo?: string }).codigo === "plano_requerido"
  );
}
