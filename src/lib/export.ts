import type { CartaoBacklog } from "@/hooks/use-backlog";

interface ExportCard {
  titulo: string;
  descricao: string;
  coluna: string;
  sprint: string;
  peso: number | string;
  data_entrega: string;
  data_conclusao: string;
  status: string;
  pr_url: string;
  criado_em: string;
}

function mapCards(cartoes: CartaoBacklog[]): ExportCard[] {
  return cartoes.map((c) => ({
    titulo: c.titulo,
    descricao: c.descricao || "",
    coluna: c.coluna_nome || "Backlog",
    sprint: c.quadro_nome || "",
    peso: c.peso ?? "",
    data_entrega: c.data_entrega ? new Date(c.data_entrega).toLocaleDateString("pt-BR") : "",
    data_conclusao: c.data_conclusao ? new Date(c.data_conclusao).toLocaleDateString("pt-BR") : "",
    status: c.concluido ? "Concluido" : c.coluna_nome ? "Em sprint" : "Backlog",
    pr_url: c.pr_url || "",
    criado_em: new Date(c.criado_em).toLocaleDateString("pt-BR"),
  }));
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCSV(cartoes: CartaoBacklog[], filename = "taskflow-export.csv") {
  const cards = mapCards(cartoes);
  if (cards.length === 0) return;

  const headers = ["Titulo", "Descricao", "Coluna", "Sprint", "Peso", "Data Entrega", "Data Conclusao", "Status", "PR", "Criado Em"];
  const keys: (keyof ExportCard)[] = ["titulo", "descricao", "coluna", "sprint", "peso", "data_entrega", "data_conclusao", "status", "pr_url", "criado_em"];

  const escapeCSV = (val: string | number) => {
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = [
    headers.join(","),
    ...cards.map((card) => keys.map((k) => escapeCSV(card[k])).join(",")),
  ];

  // BOM para Excel reconhecer UTF-8
  triggerDownload("\uFEFF" + rows.join("\n"), filename, "text/csv;charset=utf-8");
}

export function exportJSON(cartoes: CartaoBacklog[], filename = "taskflow-export.json") {
  const cards = mapCards(cartoes);
  if (cards.length === 0) return;

  triggerDownload(JSON.stringify(cards, null, 2), filename, "application/json;charset=utf-8");
}
