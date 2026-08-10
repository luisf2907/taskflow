// ═══════════════════════════════════════════════════════════════════════
// Leitura da entrada do "gerar cards" — puro, sem IO, testado em
// src/__tests__/ai-backlog-input.test.ts
// ═══════════════════════════════════════════════════════════════════════
// Duas formas de entrada convivem no mesmo campo:
//
//   requisito — prosa descrevendo o que precisa existir. A IA quebra em
//               cards e inventa criterios de aceitacao.
//   lista     — tarefas que a pessoa JA escreveu. Aqui a IA nao inventa
//               nada: converte um item em um card, na ordem, preservando
//               o texto. Antes disso tudo virava requisito, entao colar 30
//               tarefas devolvia 5 user stories inventadas por cima.
// ═══════════════════════════════════════════════════════════════════════

export const LIMITES = {
  /** Teto do campo de texto. */
  TEXTO_MAX: 10_000,
  /** Cards por geracao no modo requisito. */
  CARDS_REQUISITO: 20,
  /** Cards por geracao no modo lista (um por item). */
  CARDS_LISTA: 40,
  /**
   * Itens por chamada ao modelo no modo lista.
   *
   * Uma chamada unica pedindo 40 cards e fragil: o esquema estruturado nao
   * e garantido em todo provedor (o driver openai-compat cai pra
   * json_object quando o servidor recusa json_schema), e se a resposta
   * truncar perde-se a geracao inteira. Em lotes, truncar custa um lote.
   */
  ITENS_POR_LOTE: 10,
  /** Etiquetas novas que uma geracao pode propor. */
  ETIQUETAS_NOVAS_MAX: 5,
  /** Nome de etiqueta proposta pela IA. */
  NOME_ETIQUETA_MAX: 20,
} as const;

export type ModoGeracao = "requisito" | "lista";
export type ModoPedido = ModoGeracao | "auto";

/** `- item`, `* item`, `• item`, `1. item`, `1) item`, `[ ] item`, `[x] item` */
const RE_MARCADOR = /^(\s*)(?:[-*•–—]|\d+[.)]|\[[ xX]?\])\s+(.*)$/;

export interface ItemLista {
  texto: string;
  /** Linhas indentadas abaixo do item — viram checklist do card. */
  subitens: string[];
}

interface LinhaMarcada {
  indentacao: number;
  texto: string;
}

function lerLinhasMarcadas(texto: string): LinhaMarcada[] {
  const marcadas: LinhaMarcada[] = [];
  for (const linha of texto.split(/\r?\n/)) {
    const m = RE_MARCADOR.exec(linha);
    if (!m) continue;
    const conteudo = m[2].trim();
    if (!conteudo) continue;
    // Tab conta como dois espacos pra comparacao de profundidade.
    marcadas.push({ indentacao: m[1].replace(/\t/g, "  ").length, texto: conteudo });
  }
  return marcadas;
}

function linhasNaoVazias(texto: string): number {
  return texto.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
}

/**
 * Se o texto e uma lista de tarefas ja escrita.
 *
 * Exige marcador explicito de propósito. Prosa quebrada em varias linhas
 * pareceria lista por qualquer heuristica de "linhas curtas", e o preço do
 * falso positivo e alto: a IA para de enriquecer o requisito. Falso
 * negativo custa um clique — a UI mostra o modo detectado e deixa trocar.
 */
export function pareceLista(texto: string): boolean {
  const marcadas = lerLinhasMarcadas(texto);
  if (marcadas.length < 3) return false;
  const total = linhasNaoVazias(texto);
  return total > 0 && marcadas.length / total >= 0.5;
}

export function detectarModo(texto: string, pedido: ModoPedido = "auto"): ModoGeracao {
  if (pedido !== "auto") return pedido;
  return pareceLista(texto) ? "lista" : "requisito";
}

/**
 * Quebra o texto em itens. Linhas mais indentadas que o item anterior viram
 * subitens dele (viram checklist), em vez de cards soltos.
 */
export function parseLista(texto: string): ItemLista[] {
  const marcadas = lerLinhasMarcadas(texto);
  if (marcadas.length === 0) return [];

  const base = Math.min(...marcadas.map((m) => m.indentacao));
  const itens: ItemLista[] = [];

  for (const linha of marcadas) {
    if (linha.indentacao > base && itens.length > 0) {
      itens[itens.length - 1].subitens.push(linha.texto);
    } else {
      itens.push({ texto: linha.texto, subitens: [] });
    }
  }

  return itens;
}

export function emLotes<T>(itens: T[], tamanho: number): T[][] {
  if (tamanho < 1) return [itens];
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

export interface PlanoGeracao {
  modo: ModoGeracao;
  /** Itens que serao processados (vazio no modo requisito). */
  itens: ItemLista[];
  /** Lotes de itens, um por chamada ao modelo. */
  lotes: ItemLista[][];
  /** Itens que passaram do teto e NAO serao processados. */
  ignorados: number;
  /** Teto de cards desta geracao. */
  tetoCards: number;
}

/**
 * Decide modo, itens e lotes numa tacada — o handler so executa.
 *
 * Quando a lista passa do teto, os excedentes ficam de fora e o numero sobe
 * na resposta: cortar calado faria a pessoa achar que colou errado.
 */
export function planejar(texto: string, pedido: ModoPedido = "auto"): PlanoGeracao {
  const modo = detectarModo(texto, pedido);

  if (modo === "requisito") {
    return {
      modo,
      itens: [],
      lotes: [],
      ignorados: 0,
      tetoCards: LIMITES.CARDS_REQUISITO,
    };
  }

  const todos = parseLista(texto);
  const itens = todos.slice(0, LIMITES.CARDS_LISTA);

  return {
    modo,
    itens,
    lotes: emLotes(itens, LIMITES.ITENS_POR_LOTE),
    ignorados: todos.length - itens.length,
    tetoCards: LIMITES.CARDS_LISTA,
  };
}
