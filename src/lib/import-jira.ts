import type { ImportData, ImportCard } from "./import-types";

// Cores para etiquetas de prioridade do Jira
const PRIORITY_CORES: Record<string, string> = {
  highest: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
  lowest: "#3B82F6",
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV vazio ou sem dados.");

  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "")); // Remove BOM
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }

  return rows;
}

// Tentar encontrar a coluna por varios nomes possiveis
function findColumn(row: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    // Exact match
    if (row[name] !== undefined) return row[name];
    // Case-insensitive
    const key = Object.keys(row).find((k) => k.toLowerCase() === name.toLowerCase());
    if (key) return row[key];
  }
  return "";
}

export function parseJiraCSV(raw: string): ImportData {
  let rows: Record<string, string>[];
  try {
    rows = parseCSV(raw);
  } catch {
    throw new Error("Arquivo CSV invalido. Verifique se exportou corretamente do Jira.");
  }

  if (rows.length === 0) {
    throw new Error("CSV vazio. Nenhum issue encontrado.");
  }

  // Verificar se tem pelo menos Summary (campo obrigatorio do Jira)
  const firstRow = rows[0];
  const hasSummary = Object.keys(firstRow).some(
    (k) => k.toLowerCase() === "summary" || k.toLowerCase() === "titulo" || k.toLowerCase() === "title"
  );
  if (!hasSummary) {
    throw new Error("CSV nao parece ser um export do Jira (faltam colunas Summary ou Title).");
  }

  // Agrupar por Status (vira colunas)
  const colunaMap = new Map<string, ImportCard[]>();
  const etiquetasSet = new Map<string, string>();

  for (const row of rows) {
    const titulo = findColumn(row, "Summary", "Titulo", "Title");
    if (!titulo) continue;

    const descricao = findColumn(row, "Description", "Descricao") || null;
    const status = findColumn(row, "Status") || "To Do";
    const priority = findColumn(row, "Priority", "Prioridade");
    const labels = findColumn(row, "Labels", "Etiquetas");
    const storyPoints = findColumn(row, "Story Points", "Story points", "Custom field (Story Points)");

    // Etiquetas: priority + labels
    const cardEtiquetas: string[] = [];
    if (priority) {
      cardEtiquetas.push(priority);
      etiquetasSet.set(priority, PRIORITY_CORES[priority.toLowerCase()] || "#3B82F6");
    }
    if (labels) {
      for (const label of labels.split(/[,;]/).map((l) => l.trim()).filter(Boolean)) {
        cardEtiquetas.push(label);
        if (!etiquetasSet.has(label)) etiquetasSet.set(label, "#6366F1");
      }
    }

    const card: ImportCard = {
      titulo,
      descricao,
      peso: storyPoints ? parseInt(storyPoints, 10) || null : null,
      etiquetas: cardEtiquetas,
      checklists: [], // Jira CSV nao exporta subtasks como checklists
    };

    const existing = colunaMap.get(status) || [];
    existing.push(card);
    colunaMap.set(status, existing);
  }

  // Ordenar colunas: To Do primeiro, Done por ultimo
  const STATUS_ORDER = ["to do", "backlog", "open", "in progress", "em andamento", "in review", "em revisao", "done", "concluido", "closed"];
  const colunas = Array.from(colunaMap.entries())
    .sort((a, b) => {
      const ia = STATUS_ORDER.findIndex((s) => a[0].toLowerCase().includes(s));
      const ib = STATUS_ORDER.findIndex((s) => b[0].toLowerCase().includes(s));
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map(([nome, cards]) => ({ nome, cards }));

  return {
    nomeBoard: "Jira Import",
    colunas,
    etiquetas: Array.from(etiquetasSet.entries()).map(([nome, cor]) => ({ nome, cor })),
  };
}
