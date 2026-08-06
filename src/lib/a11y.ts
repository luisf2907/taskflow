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

function tempoPorExtenso(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  if (min === 0) return `${seg} segundo${seg === 1 ? "" : "s"}`;
  const partes = [`${min} minuto${min === 1 ? "" : "s"}`];
  if (seg > 0) partes.push(`${seg} segundo${seg === 1 ? "" : "s"}`);
  return partes.join(" e ");
}

/**
 * Props para uma barra de progresso de audio virar um slider de verdade.
 *
 * As barras eram `<div onClick>` que calculavam a posicao pelo X do mouse.
 * Sem mouse, nao havia como avancar, voltar ou ir ao fim de uma gravacao —
 * o audio ficava restrito a tocar e pausar.
 *
 * Espalhe o retorno na propria barra, mantendo o onClick existente:
 *
 *   <div {...propsBarraDeAudio({ ... })} onClick={seek} ref={barraRef}>
 *
 * Os quatro pedacos que fazem isso funcionar:
 *   role="slider"  -> anunciado como controle de valor, nao como texto
 *   tabIndex       -> alcancavel por Tab
 *   aria-value*    -> a posicao atual vira informacao, nao so pixels
 *   onKeyDown      -> setas, Home, End e PageUp/Down movem de fato
 *
 * aria-valuenow vai em SEGUNDOS (numero) e aria-valuetext em texto
 * ("1 minuto e 30 segundos"). Sem o valuetext, o leitor de tela anuncia
 * "90", que nao diz nada a quem esta ouvindo uma gravacao.
 */
export function propsBarraDeAudio(opts: {
  /** Ex.: "Progresso do áudio". Vira o nome do controle. */
  rotulo: string;
  atualMs: number;
  totalMs: number;
  /** Recebe a nova posicao em milissegundos, ja limitada ao intervalo. */
  irPara: (ms: number) => void;
  /** Salto das setas. Default 5s, o mesmo dos players conhecidos. */
  passoMs?: number;
}) {
  const { rotulo, atualMs, totalMs, irPara, passoMs = 5000 } = opts;
  const valido = Number.isFinite(totalMs) && totalMs > 0;

  const mover = (ms: number) => irPara(Math.max(0, Math.min(totalMs, ms)));

  return {
    role: "slider" as const,
    tabIndex: 0,
    "aria-label": rotulo,
    "aria-valuemin": 0,
    "aria-valuemax": valido ? Math.round(totalMs / 1000) : 0,
    "aria-valuenow": valido ? Math.round(atualMs / 1000) : 0,
    "aria-valuetext": valido
      ? `${tempoPorExtenso(atualMs)} de ${tempoPorExtenso(totalMs)}`
      : "sem áudio carregado",
    onKeyDown: (e: KeyboardEvent) => {
      if (!valido) return;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          mover(atualMs + passoMs);
          break;
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          mover(atualMs - passoMs);
          break;
        case "PageUp":
          e.preventDefault();
          mover(atualMs + passoMs * 6);
          break;
        case "PageDown":
          e.preventDefault();
          mover(atualMs - passoMs * 6);
          break;
        case "Home":
          e.preventDefault();
          mover(0);
          break;
        case "End":
          e.preventDefault();
          mover(totalMs);
          break;
      }
    },
  };
}
