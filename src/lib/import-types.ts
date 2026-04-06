export interface ImportCard {
  titulo: string;
  descricao: string | null;
  peso: number | null;
  etiquetas: string[]; // nomes
  checklists: { titulo: string; itens: { texto: string; concluido: boolean }[] }[];
}

export interface ImportColuna {
  nome: string;
  cards: ImportCard[];
}

export interface ImportData {
  nomeBoard: string;
  colunas: ImportColuna[];
  etiquetas: { nome: string; cor: string }[];
}
