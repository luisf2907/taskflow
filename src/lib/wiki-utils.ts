import type { WikiPagina, WikiPaginaTree } from "@/types";

/**
 * Converte título em slug URL-safe.
 * Trata acentos, cedilha, espaços, caracteres especiais.
 */
export function slugify(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-") // espaços → hífens
    .replace(/-+/g, "-") // múltiplos hífens → um
    .replace(/^-|-$/g, "") // remove hífens nas pontas
    || "sem-titulo";
}

/**
 * Gera slug único verificando contra slugs existentes.
 * Se colidir, appenda sufixo numérico.
 */
export function gerarSlugUnico(titulo: string, slugsExistentes: string[]): string {
  const base = slugify(titulo);
  if (!slugsExistentes.includes(base)) return base;

  let i = 2;
  while (slugsExistentes.includes(`${base}-${i}`)) {
    i++;
  }
  return `${base}-${i}`;
}

/**
 * Converte lista flat de páginas em árvore hierárquica.
 * Páginas sem parent_id ficam na raiz.
 * Ordena por posicao dentro de cada nível.
 */
export function buildTree(paginas: WikiPagina[]): WikiPaginaTree[] {
  const map = new Map<string, WikiPaginaTree>();
  const roots: WikiPaginaTree[] = [];

  // Cria nós com array de filhos
  for (const p of paginas) {
    map.set(p.id, { ...p, filhos: [] });
  }

  // Monta a árvore
  for (const p of paginas) {
    const node = map.get(p.id)!;
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.filhos.push(node);
    } else {
      roots.push(node);
    }
  }

  // Ordena por posicao em cada nível
  const sortByPosicao = (arr: WikiPaginaTree[]) => {
    arr.sort((a, b) => a.posicao - b.posicao);
    for (const node of arr) {
      if (node.filhos.length > 0) sortByPosicao(node.filhos);
    }
  };

  sortByPosicao(roots);
  return roots;
}

/**
 * Encontra uma página na árvore por ID (busca recursiva).
 */
export function encontrarPaginaNaArvore(
  arvore: WikiPaginaTree[],
  id: string,
): WikiPaginaTree | null {
  for (const node of arvore) {
    if (node.id === id) return node;
    if (node.filhos.length > 0) {
      const found = encontrarPaginaNaArvore(node.filhos, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Retorna o caminho de breadcrumb até uma página (do root até ela).
 */
export function getBreadcrumb(
  paginas: WikiPagina[],
  paginaId: string,
): WikiPagina[] {
  const map = new Map(paginas.map((p) => [p.id, p]));
  const path: WikiPagina[] = [];
  let current = map.get(paginaId);

  while (current) {
    path.unshift(current);
    current = current.parent_id ? map.get(current.parent_id) : undefined;
  }

  return path;
}
