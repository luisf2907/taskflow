import { describe, it, expect } from "vitest";
import { markdownToTiptapJson, tiptapJsonToMarkdown } from "@/lib/wiki-markdown";

// ═══════════════════════════════════════════════════════════════════════
// Ponte markdown <-> TipTap da wiki
// ═══════════════════════════════════════════════════════════════════════
// A pagina da wiki guarda TipTap JSON no banco. O modo Markdown converte
// nos dois sentidos, e `handleMarkdownChange` GRAVA a cada tecla — entao
// qualquer coisa que a conversao perca e perdida de verdade, nao so na
// tela. Estes testes existem porque uma tabela inteira sumiu assim.
// ═══════════════════════════════════════════════════════════════════════

/** markdown -> TipTap -> markdown */
function volta(md: string): string {
  return tiptapJsonToMarkdown(markdownToTiptapJson(md));
}

/** Ida e volta preserva o conteudo, e repetir nao muda mais nada. */
function estavel(md: string) {
  const primeira = volta(md);
  expect(volta(primeira)).toBe(primeira);
  return primeira;
}

describe("wiki-markdown: tabelas", () => {
  const TABELA = [
    "| Item | Tecnologia |",
    "| --- | --- |",
    "| Linguagem | TypeScript (strict) |",
    "| Monorepo | Turborepo |",
    "",
  ].join("\n");

  it("preserva as celulas (a regressao que apagou a pagina Stack)", () => {
    expect(estavel(TABELA)).toBe(TABELA);
  });

  it("monta celulas de verdade, nao linhas vazias", () => {
    const doc = markdownToTiptapJson(TABELA) as {
      content: Array<{ type: string; content: Array<{ content?: unknown[] }> }>;
    };
    const tabela = doc.content.find((n) => n.type === "table")!;
    expect(tabela.content).toHaveLength(3);
    for (const linha of tabela.content) {
      expect(linha.content).toHaveLength(2);
    }
  });

  it("mantem negrito, code e link dentro da celula", () => {
    const md = "| A | B |\n| --- | --- |\n| **x** | `y` |\n";
    expect(estavel(md)).toBe(md);
    expect(estavel("| A |\n| --- |\n| [s](https://x.com) |\n")).toContain("[s](https://x.com)");
  });

  it("escapa o pipe em vez de partir a tabela na coluna errada", () => {
    const md = "| A |\n| --- |\n| a \\| b |\n";
    expect(estavel(md)).toBe(md);
  });

  it("respeita o prefixo de linha dentro de blockquote", () => {
    const md = "> | A | B |\n> | --- | --- |\n> | 1 | 2 |\n";
    expect(estavel(md)).toBe(md);
  });

  it("completa a linha curta em vez de perder colunas", () => {
    expect(estavel("| A | B | C |\n| --- | --- | --- |\n| 1 |\n")).toBe(
      "| A | B | C |\n| --- | --- | --- |\n| 1 |  |  |\n"
    );
  });
});

describe("wiki-markdown: marcas", () => {
  // O schema do TipTap chama de bold/italic o que o CommonMark chama de
  // strong/em. Com os nomes trocados isso lancava excecao, nao degradava.
  it("negrito e italico nao estouram a conversao", () => {
    expect(estavel("**a**\n")).toContain("**a**");
    expect(estavel("*a*\n")).toContain("*a*");
  });

  it("sobrevivem a ida e volta pelo TipTap", () => {
    const doc = markdownToTiptapJson("**a** e *b*\n") as {
      content: Array<{ content: Array<{ marks?: Array<{ type: string }> }> }>;
    };
    const marcas = doc.content[0].content.flatMap((n) => n.marks ?? []).map((m) => m.type);
    expect(marcas).toContain("bold");
    expect(marcas).toContain("italic");
  });

  it("code e strike continuam inteiros", () => {
    expect(estavel("`a`\n")).toContain("`a`");
    expect(estavel("~~a~~\n")).toContain("~~a~~");
  });
});

describe("wiki-markdown: o que sumia em silencio", () => {
  it("imagem sozinha vira no de imagem, nao paragrafo vazio", () => {
    const md = "![alt](https://x.com/a.png)\n";
    const doc = markdownToTiptapJson(md) as {
      content: Array<{ type: string; attrs?: Record<string, unknown> }>;
    };
    expect(doc.content[0].type).toBe("image");
    expect(doc.content[0].attrs).toMatchObject({
      src: "https://x.com/a.png",
      alt: "alt",
    });
    expect(estavel(md)).toContain("https://x.com/a.png");
  });

  it("imagem no meio da frase guarda a URL como link", () => {
    // Nao existe imagem inline no schema; virar link perde a miniatura mas
    // nao o endereco, que era o que acontecia antes.
    expect(volta("veja ![a](https://x.com/a.png) aqui\n")).toContain("https://x.com/a.png");
  });

  it("HTML inline vira texto em vez de abortar o parser", () => {
    expect(() => volta("um <b>dois</b> tres\n")).not.toThrow();
    expect(volta("um <b>dois</b> tres\n")).toContain("dois");
  });

  it("HTML em bloco nao e engolido como cartao sem id", () => {
    expect(volta("<div>oi</div>\n")).toContain("oi");
  });

  it("embed de cartao continua sendo embed", () => {
    const id = "a1b2c3d4-0000-0000-0000-000000000000";
    const doc = markdownToTiptapJson(`<!-- card:${id} -->\n`) as {
      content: Array<{ type: string; attrs?: Record<string, unknown> }>;
    };
    expect(doc.content[0].type).toBe("cardEmbed");
    expect(doc.content[0].attrs).toMatchObject({ cardId: id });
  });

  it("lista de tarefas continua sendo tarefa", () => {
    const md = "- [x] feito\n- [ ] pendente\n";
    const doc = markdownToTiptapJson(md) as {
      content: Array<{
        type: string;
        content: Array<{ type: string; attrs?: Record<string, unknown> }>;
      }>;
    };
    expect(doc.content[0].type).toBe("taskList");
    expect(doc.content[0].content.map((i) => i.attrs?.checked)).toEqual([true, false]);
    const ida = estavel(md);
    expect(ida).toContain("[x] feito");
    expect(ida).toContain("[ ] pendente");
    // O prefixo nao pode virar texto escapado.
    expect(ida).not.toContain("\\[");
  });

  it("lista misturada fica lista comum, sem sumir", () => {
    const saida = volta("- [x] tarefa\n- solto\n");
    expect(saida).toContain("tarefa");
    expect(saida).toContain("solto");
  });
});

describe("wiki-markdown: estrutura basica", () => {
  it("titulos, citacao, codigo e listas voltam iguais", () => {
    for (const md of ["# a\n", "> citado\n", "```ts\nconst a = 1;\n```\n", "1. um\n", "- um\n", "---\n"]) {
      expect(() => estavel(md)).not.toThrow();
      expect(estavel(md).trim()).toBe(md.trim());
    }
  });

  it("a pagina Stack inteira sobrevive", () => {
    const pagina = [
      "# Stack — MVP Healthtech",
      "",
      "## Linguagem e ferramentas",
      "",
      "| Item | Tecnologia |",
      "| --- | --- |",
      "| Linguagem | TypeScript (strict) |",
      "| Gerenciador de pacotes | pnpm |",
      "",
      "## Dados",
      "",
      "| Item | Tecnologia |",
      "| --- | --- |",
      "| Banco | PostgreSQL (Supabase, `sa-east-1`) |",
      "",
      "---",
      "",
      "## Regras fixas",
      "",
      "- Nada entra sem aprovação do **Tech Lead**.",
      "- A `service_role key` vive apenas no backend.",
      "",
    ].join("\n");
    // O serializer nao fecha o documento com \n quando o ultimo bloco e uma
    // lista; o que importa aqui e o corpo.
    expect(estavel(pagina).trimEnd()).toBe(pagina.trimEnd());
  });
});
