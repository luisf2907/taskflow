// ═══════════════════════════════════════════════════════════════════════
// Chaves SWR do board — um contrato, um lugar
// ═══════════════════════════════════════════════════════════════════════
// Estas tres chaves sao o ponto de encontro entre a busca no SERVIDOR e os
// hooks no CLIENT: o Server Component de /quadro/[id] injeta o resultado do
// `get_board_data` no `fallback` do SWRConfig usando exatamente estas
// chaves, e os hooks leem por elas.
//
// Antes elas eram montadas a mao em 9 lugares — funcoes privadas em tres
// hooks, mais template strings soltas em use-realtime, use-backlog e
// detalhe-cartao. Um rename quebraria o fallback EM SILENCIO: sem erro, sem
// teste vermelho, e a LCP voltaria pros 2,9s sem ninguem perceber.
//
// Centralizado, um rename vira erro de compilacao.
//
// Modulo neutro de proposito (sem "use client", sem imports): precisa ser
// importavel dos dois lados da fronteira servidor/client.
// ═══════════════════════════════════════════════════════════════════════

export function chaveQuadro(quadroId: string) {
  return `quadro-${quadroId}`;
}

export function chaveColunas(quadroId: string) {
  return `colunas-${quadroId}`;
}

export function chaveCartoes(quadroId: string) {
  return `cartoes-${quadroId}`;
}
