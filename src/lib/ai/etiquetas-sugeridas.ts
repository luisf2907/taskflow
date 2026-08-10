// ═══════════════════════════════════════════════════════════════════════
// Etiquetas vindas da IA — puro, testado em
// src/__tests__/ai-etiquetas-sugeridas.test.ts
// ═══════════════════════════════════════════════════════════════════════
// O modelo devolve etiquetas por NOME, nao por id. Pedir id sempre teve um
// modo de falha ruim: id inventado nao existe, e o handler descartava em
// silencio — a etiqueta simplesmente nao aparecia no card e ninguem sabia
// por que. Por nome, o que nao casa com uma etiqueta existente vira
// proposta de etiqueta nova, visivel no preview antes de virar registro.
// ═══════════════════════════════════════════════════════════════════════

import { CORES_ETIQUETA } from "@/lib/colors";
import { LIMITES } from "./backlog-input";

export interface EtiquetaExistente {
  id: string;
  nome: string;
  cor: string;
}

export interface EtiquetaNova {
  nome: string;
  cor: string;
}

/** Nome como vai aparecer: espacos colapsados e cortado no limite. */
export function normalizarNomeEtiqueta(nome: string): string {
  return String(nome ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITES.NOME_ETIQUETA_MAX);
}

/**
 * Chave de comparacao: sem acento, sem caixa, sem separador. Faz "Back-end",
 * "back end" e "Backend" caírem na mesma etiqueta — o modelo varia a grafia
 * entre lotes, e sem isso a mesma etiqueta nasceria tres vezes.
 */
export function chaveEtiqueta(nome: string): string {
  return normalizarNomeEtiqueta(nome)
    .toLowerCase()
    // NFD separa o acento da letra; o filtro abaixo descarta o acento
    // junto com pontuacao e espaco, entao nao precisa de passo proprio.
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Cores para as etiquetas novas, evitando as ja usadas no workspace. Quando
 * a paleta inteira esta em uso, volta a repetir — cor repetida incomoda
 * menos que recusar a etiqueta.
 */
export function escolherCores(quantidade: number, coresEmUso: string[]): string[] {
  const usadas = new Set(coresEmUso.map((c) => c.trim().toUpperCase()));
  const livres = CORES_ETIQUETA.filter((c) => !usadas.has(c.toUpperCase()));
  const fila = livres.length > 0 ? livres : CORES_ETIQUETA;
  return Array.from({ length: quantidade }, (_, i) => fila[i % fila.length]);
}

export interface ResolucaoEtiquetas {
  /** chave → id real (existentes) ou `novo:<indice>` (propostas). */
  porChave: Map<string, string>;
  novas: EtiquetaNova[];
  /** Nomes recusados por terem passado do teto de etiquetas novas. */
  recusadas: string[];
}

/**
 * Casa os nomes que a IA devolveu contra as etiquetas do workspace.
 *
 * O que nao casa vira proposta, ate ETIQUETAS_NOVAS_MAX — sem teto, um
 * texto grande vira uma dezena de etiquetas quase iguais e polui o
 * workspace de forma dificil de desfazer. As propostas recebem a chave
 * `novo:<i>`; quem cria de fato e o cliente, no confirmar.
 */
export function resolverEtiquetas(
  nomes: string[],
  existentes: EtiquetaExistente[],
  maxNovas: number = LIMITES.ETIQUETAS_NOVAS_MAX
): ResolucaoEtiquetas {
  const porChave = new Map<string, string>();
  for (const e of existentes) {
    const chave = chaveEtiqueta(e.nome);
    if (chave) porChave.set(chave, e.id);
  }

  const novas: EtiquetaNova[] = [];
  const recusadas: string[] = [];
  const pendentes: string[] = [];

  for (const bruto of nomes) {
    const nome = normalizarNomeEtiqueta(bruto);
    const chave = chaveEtiqueta(nome);
    if (!chave || porChave.has(chave)) continue;

    if (pendentes.length >= maxNovas) {
      if (!recusadas.includes(nome)) recusadas.push(nome);
      continue;
    }
    porChave.set(chave, `novo:${pendentes.length}`);
    pendentes.push(nome);
  }

  const cores = escolherCores(
    pendentes.length,
    existentes.map((e) => e.cor)
  );
  pendentes.forEach((nome, i) => novas.push({ nome, cor: cores[i] }));

  return { porChave, novas, recusadas };
}

/** Nomes de um card → chaves resolvidas, sem repetir. */
export function idsDoCard(
  nomes: unknown,
  resolucao: ResolucaoEtiquetas
): string[] {
  if (!Array.isArray(nomes)) return [];
  const ids: string[] = [];
  for (const nome of nomes) {
    const id = resolucao.porChave.get(chaveEtiqueta(String(nome ?? "")));
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
