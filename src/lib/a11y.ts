import type { KeyboardEvent } from "react";

// ═══════════════════════════════════════════════════════════════════════
// Helpers de acessibilidade
// ═══════════════════════════════════════════════════════════════════════

/**
 * Handler de teclado para elementos que se comportam como botao mas nao
 * sao `<button>` — tipicamente uma `<div>` clicavel que nao pode virar
 * botao sem quebrar o layout (grid, flex, cards com conteudo complexo).
 *
 * Usar sempre em conjunto com `role="button"` e `tabIndex={0}`. Os tres
 * juntos e que tornam o elemento operavel por teclado; qualquer um
 * sozinho nao resolve:
 *
 *   role      -> o leitor de tela anuncia como botao
 *   tabIndex  -> entra na ordem de tabulacao
 *   onKeyDown -> Enter e Espaco ativam, como num botao de verdade
 *
 * O preventDefault no Espaco evita a rolagem da pagina, que e o
 * comportamento padrao dele fora de um controle.
 *
 * NAO use em backdrop de modal nem em elemento que existe so para
 * `stopPropagation`. Nesses casos o alvo nao e um controle, e adicionar
 * tabIndex cria uma parada fantasma na navegacao por Tab — o equivalente
 * de teclado de um backdrop e a tecla Esc.
 */
export function aoAtivarPorTeclado(acao: (() => void) | undefined) {
  return (e: KeyboardEvent) => {
    if (!acao) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      acao();
    }
  };
}
