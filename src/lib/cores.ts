// ═══════════════════════════════════════════════════════════════════════
// Nomes legiveis para as cores da paleta
// ═══════════════════════════════════════════════════════════════════════
// Os seletores de cor (quadro, workspace, sprint) sao botoes SEM texto —
// so um quadrado com background. Para um leitor de tela isso e "botao",
// repetido dez vezes, sem nenhuma forma de distinguir ou de saber qual
// esta escolhido.
//
// Ler o hex em voz alta ("sustenido C quatro oito quatro um D") nao ajuda.
// Este mapa da a cada botao um nome que uma pessoa reconhece.
//
// A paleta esta duplicada em tres arquivos (modal-criar-quadro,
// modal-workspace e workspace/[id]/page). Unificar isso e outro trabalho;
// aqui so garantimos que qualquer um dos hex tenha nome.
// ═══════════════════════════════════════════════════════════════════════

const NOMES: Record<string, string> = {
  "#C4841D": "Âmbar",
  "#3D8B37": "Verde",
  "#B04632": "Vermelho",
  "#2E86AB": "Azul",
  "#89609E": "Roxo",
  "#CD5A91": "Rosa",
  "#00857C": "Turquesa",
  "#D4732A": "Laranja",
  "#6B6560": "Cinza",
  "#2D2A26": "Grafite",
};

/**
 * Nome legivel de uma cor da paleta, para usar em `aria-label`.
 *
 * Cor fora do mapa cai no proprio hex — feio de ouvir, mas ainda unico, o
 * que e melhor que dez botoes indistinguiveis.
 */
export function nomeDaCor(hex: string): string {
  return NOMES[hex.toUpperCase()] ?? hex;
}
