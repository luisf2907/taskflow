import type { ImportData, ImportCard } from "./import-types";

// Mapa de cores do Trello → hex
const TRELLO_CORES: Record<string, string> = {
  green: "#22C55E",
  yellow: "#EAB308",
  orange: "#F97316",
  red: "#EF4444",
  purple: "#A855F7",
  blue: "#3B82F6",
  sky: "#0EA5E9",
  lime: "#84CC16",
  pink: "var(--tf-text-secondary)",
  black: "#1C2B29",
  green_dark: "#15803D",
  yellow_dark: "#A16207",
  orange_dark: "#C2410C",
  red_dark: "#B91C1C",
  purple_dark: "#7E22CE",
  blue_dark: "#1D4ED8",
  sky_dark: "#0369A1",
  lime_dark: "#4D7C0F",
  pink_dark: "#BE185D",
  black_dark: "#0A0A0A",
};

interface TrelloBoard {
  name?: string;
  lists?: { id: string; name: string; closed?: boolean }[];
  cards?: {
    id: string;
    name: string;
    desc?: string;
    idList: string;
    closed?: boolean;
    idLabels?: string[];
  }[];
  labels?: { id: string; name: string; color?: string }[];
  checklists?: {
    id: string;
    name: string;
    idCard: string;
    checkItems?: { name: string; state: string }[];
  }[];
}

export function parseTrelloJSON(raw: string): ImportData {
  let board: TrelloBoard;
  try {
    board = JSON.parse(raw);
  } catch {
    throw new Error("Arquivo JSON invalido. Verifique se exportou corretamente do Trello.");
  }

  if (!board.lists || !board.cards) {
    throw new Error("Arquivo nao parece ser um export do Trello (faltam lists ou cards).");
  }

  // Filtrar listas e cards nao arquivados
  const lists = (board.lists || []).filter((l) => !l.closed);
  const cards = (board.cards || []).filter((c) => !c.closed);
  const labels = board.labels || [];
  const checklists = board.checklists || [];

  // Mapa de label id → nome/cor
  const labelMap = new Map(labels.map((l) => [l.id, l]));

  // Mapa de checklists por card id
  const checklistsByCard = new Map<string, typeof checklists>();
  for (const cl of checklists) {
    const list = checklistsByCard.get(cl.idCard) || [];
    list.push(cl);
    checklistsByCard.set(cl.idCard, list);
  }

  // Etiquetas unicas (com nome)
  const etiquetasMap = new Map<string, string>();
  for (const l of labels) {
    if (l.name) {
      etiquetasMap.set(l.name, TRELLO_CORES[l.color || ""] || "#3B82F6");
    }
  }

  // Montar colunas com cards
  const colunas = lists.map((list) => {
    const colCards = cards.filter((c) => c.idList === list.id);

    const importCards: ImportCard[] = colCards.map((card) => {
      // Etiquetas do card
      const cardEtiquetas = (card.idLabels || [])
        .map((id) => labelMap.get(id)?.name)
        .filter(Boolean) as string[];

      // Checklists do card
      const cardChecklists = (checklistsByCard.get(card.id) || []).map((cl) => ({
        titulo: cl.name,
        itens: (cl.checkItems || []).map((item) => ({
          texto: item.name,
          concluido: item.state === "complete",
        })),
      }));

      return {
        titulo: card.name,
        descricao: card.desc || null,
        peso: null,
        etiquetas: cardEtiquetas,
        checklists: cardChecklists,
      };
    });

    return { nome: list.name, cards: importCards };
  });

  return {
    nomeBoard: board.name || "Trello Import",
    colunas,
    etiquetas: Array.from(etiquetasMap.entries()).map(([nome, cor]) => ({ nome, cor })),
  };
}
