import { getSchema } from "@tiptap/core";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";
import {
  MarkdownSerializer,
  MarkdownSerializerState,
  MarkdownParser,
} from "prosemirror-markdown";
import MarkdownIt from "markdown-it";
import { getWikiSchemaExtensions } from "@/components/wiki/wiki-extensions";

// ==========================================
// Schema (cached)
// ==========================================
let cachedSchema: ReturnType<typeof getSchema> | null = null;

function getWikiSchema() {
  if (!cachedSchema) {
    cachedSchema = getSchema(getWikiSchemaExtensions());
  }
  return cachedSchema;
}

// ==========================================
// Serializer: TipTap JSON → Markdown
// ==========================================

function escapeMarkdown(text: string) {
  return text.replace(/([\\`*_{}[\]()#+\-.!|])/g, "\\$1");
}

const wikiSerializer = new MarkdownSerializer(
  {
    // -- Standard nodes --
    blockquote(state, node) {
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
    },
    codeBlock(state, node) {
      const lang = (node.attrs.language as string) || "";
      state.write(`\`\`\`${lang}\n`);
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write("```");
      state.closeBlock(node);
    },
    heading(state, node) {
      state.write(`${"#".repeat(node.attrs.level as number)} `);
      state.renderInline(node);
      state.closeBlock(node);
    },
    horizontalRule(state, node) {
      state.write("---");
      state.closeBlock(node);
    },
    bulletList(state, node) {
      state.renderList(node, "  ", () => "- ");
    },
    orderedList(state, node) {
      const start = (node.attrs.start as number) || 1;
      state.renderList(node, "  ", (i) => `${start + i}. `);
    },
    listItem(state, node) {
      state.renderContent(node);
    },
    paragraph(state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },
    image(state, node) {
      const alt = (node.attrs.alt as string) || "";
      const src = (node.attrs.src as string) || "";
      state.write(`![${escapeMarkdown(alt)}](${src})`);
      state.closeBlock(node);
    },
    hardBreak(state) {
      state.write("  \n");
    },
    text(state, node) {
      state.text(node.text || "");
    },

    // -- Task list --
    taskList(state, node) {
      state.renderList(node, "  ", () => "- ");
    },
    taskItem(state, node) {
      const checked = node.attrs.checked ? "x" : " ";
      state.write(`[${checked}] `);
      state.renderContent(node);
    },

    // -- Table (GFM) --
    table(state, node) {
      // Collect rows
      const rows: ProsemirrorNode[] = [];
      node.forEach((row) => rows.push(row));
      if (rows.length === 0) {
        state.closeBlock(node);
        return;
      }

      // Determine column count from first row
      const colCount = rows[0].childCount;

      // Render each row
      rows.forEach((row, rowIndex) => {
        state.write("| ");
        for (let c = 0; c < row.childCount; c++) {
          const cell = row.child(c);
          const cellText = cell.textContent.trim();
          state.write(cellText);
          if (c < row.childCount - 1) state.write(" | ");
        }
        state.write(" |\n");

        // Add separator after header row
        if (rowIndex === 0) {
          state.write("| ");
          for (let c = 0; c < colCount; c++) {
            state.write("---");
            if (c < colCount - 1) state.write(" | ");
          }
          state.write(" |\n");
        }
      });
      state.closeBlock(node);
    },
    tableRow() {
      // Handled by table
    },
    tableHeader() {
      // Handled by table
    },
    tableCell() {
      // Handled by table
    },

    // -- Card embed (custom) --
    cardEmbed(state, node) {
      const cardId = node.attrs.cardId as string;
      if (cardId) {
        state.write(`<!-- card:${cardId} -->`);
        state.closeBlock(node);
      }
    },
  },
  {
    // -- Marks --
    em: {
      open: "*",
      close: "*",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    strong: {
      open: "**",
      close: "**",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    link: {
      open(_state, mark) {
        return "[";
      },
      close(_state, mark) {
        const href = (mark.attrs.href as string) || "";
        return `](${href})`;
      },
    },
    code: {
      open: "`",
      close: "`",
      escape: false,
    },
    strike: {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    highlight: {
      open: "==",
      close: "==",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    underline: {
      open: "",
      close: "",
    },
  },
);

// ==========================================
// Parser: Markdown → TipTap JSON
// ==========================================

const md = MarkdownIt("commonmark", { html: true }).enable("table").enable("strikethrough");

// Add task list support to markdown-it
function taskListPlugin(mdi: MarkdownIt) {
  mdi.core.ruler.after("inline", "task-list", (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "inline") continue;
      const content = tokens[i].content;
      if (/^\[([ xX])\]\s/.test(content)) {
        const checked = content[1] !== " ";
        tokens[i].content = content.replace(/^\[([ xX])\]\s/, "");
        // Mark the parent list_item
        for (let j = i - 1; j >= 0; j--) {
          if (tokens[j].type === "list_item_open") {
            tokens[j].attrSet("data-task", "true");
            tokens[j].attrSet("data-checked", String(checked));
            break;
          }
        }
      }
    }
  });
}

md.use(taskListPlugin);

function buildParser() {
  const schema = getWikiSchema();

  return new MarkdownParser(schema, md, {
    blockquote: { block: "blockquote" },
    paragraph: { block: "paragraph" },
    list_item: { block: "listItem" },
    bullet_list: { block: "bulletList" },
    ordered_list: {
      block: "orderedList",
      getAttrs: (tok) => ({ start: Number(tok.attrGet("start")) || 1 }),
    },
    heading: {
      block: "heading",
      getAttrs: (tok) => ({ level: Number(tok.tag.slice(1)) }),
    },
    code_block: {
      block: "codeBlock",
      getAttrs: (tok) => ({ language: tok.info || "" }),
    },
    fence: {
      block: "codeBlock",
      getAttrs: (tok) => ({ language: tok.info || "" }),
    },
    hr: { node: "horizontalRule" },
    image: {
      node: "image",
      getAttrs: (tok) => ({
        src: tok.attrGet("src") || "",
        alt: tok.children?.[0]?.content || "",
      }),
    },
    hardbreak: { node: "hardBreak" },
    em: { mark: "em" },
    strong: { mark: "strong" },
    link: {
      mark: "link",
      getAttrs: (tok) => ({
        href: tok.attrGet("href") || "",
        title: tok.attrGet("title") || null,
      }),
    },
    code_inline: { mark: "code" },
    s: { mark: "strike" },
    // Table tokens
    table: { block: "table" },
    thead: { ignore: true },
    tbody: { ignore: true },
    tr: { block: "tableRow" },
    th: { block: "tableHeader" },
    td: { block: "tableCell" },
    // HTML block for card embeds
    html_block: {
      node: "cardEmbed",
      getAttrs: (tok) => {
        const match = tok.content.match(/<!--\s*card:([a-f0-9-]+)\s*-->/);
        if (match) return { cardId: match[1] };
        return null;
      },
    },
  });
}

let cachedParser: MarkdownParser | null = null;

function getParser() {
  if (!cachedParser) {
    cachedParser = buildParser();
  }
  return cachedParser;
}

// ==========================================
// Public API
// ==========================================

/**
 * Converte TipTap JSON para string Markdown.
 */
export function tiptapJsonToMarkdown(
  json: Record<string, unknown>,
): string {
  const schema = getWikiSchema();
  const doc = ProsemirrorNode.fromJSON(schema, json);
  return wikiSerializer.serialize(doc);
}

/**
 * Converte string Markdown para TipTap JSON.
 */
export function markdownToTiptapJson(
  markdown: string,
): Record<string, unknown> {
  const parser = getParser();

  // Pre-process: card embeds are HTML comments, ensure they're on their own line
  const processed = markdown.replace(
    /<!--\s*card:([a-f0-9-]+)\s*-->/g,
    "\n<!-- card:$1 -->\n",
  );

  const doc = parser.parse(processed);
  if (!doc) {
    // Fallback: return empty doc
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  return doc.toJSON() as Record<string, unknown>;
}
