import { getSchema } from "@tiptap/core";
import { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { MarkdownSerializer, MarkdownSerializerState, MarkdownParser } from "prosemirror-markdown";
import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
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

/**
 * `out` e o buffer de saida e `delim` o prefixo de linha (o "> " de um
 * blockquote, por exemplo). A tipagem publica do prosemirror-markdown nao
 * expoe nenhum dos dois, mas eles existem em runtime e sao o unico jeito
 * de capturar o que `renderInline` produz.
 */
type EstadoComBuffer = MarkdownSerializerState & { out: string; delim: string };

/**
 * Serializa o conteudo de uma celula para uma unica linha de texto.
 *
 * O caminho obvio seria `celula.textContent`, e era o que estava aqui — mas
 * textContent devolve so o texto cru, entao **negrito**, links e `code`
 * dentro de uma celula sumiam a cada ida e volta. `renderInline` preserva as
 * marcas; o preco e que ele escreve direto no buffer, e nao devolve string.
 * Dai a captura: anota onde o buffer estava, deixa renderizar, corta o
 * pedaco novo e restaura o buffer.
 *
 * O `delim` e zerado durante a captura porque uma tabela dentro de
 * blockquote faria cada celula comecar com "> ".
 *
 * Uma celula do GFM cabe em uma linha so: quebras viram espaco, e `|`
 * precisa de escape ou parte a tabela na coluna errada (o `esc` do
 * prosemirror-markdown nao trata esse caractere, que so e especial aqui).
 */
function textoDaCelula(state: MarkdownSerializerState, celula: ProsemirrorNode): string {
  const buffer = state as EstadoComBuffer;
  const delimAnterior = buffer.delim;
  buffer.delim = "";

  const partes: string[] = [];
  celula.forEach((filho) => {
    const inicio = buffer.out.length;
    if (filho.isTextblock) {
      state.renderInline(filho);
    } else {
      // Bloco que nao cabe numa celula do GFM (lista aninhada, imagem
      // solta). Salva o texto em vez de descartar a celula inteira.
      state.text(filho.textContent, false);
    }
    partes.push(buffer.out.slice(inicio));
    buffer.out = buffer.out.slice(0, inicio);
  });

  buffer.delim = delimAnterior;

  return partes
    .join(" ")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
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
      const linhas: ProsemirrorNode[] = [];
      node.forEach((linha) => linhas.push(linha));
      if (linhas.length === 0) {
        state.closeBlock(node);
        return;
      }

      // Descarrega o bloco anterior ANTES de capturar qualquer celula.
      // textoDaCelula le o buffer de saida, e um fechamento de bloco
      // pendente acabaria dentro do texto da primeira celula.
      state.write("");

      // A largura vem da linha MAIS LARGA, nao da primeira. Uma linha mais
      // curta que o cabecalho perde colunas no GFM; aqui ela e completada.
      const colunas = linhas.reduce((max, l) => Math.max(max, l.childCount), 0);

      const escreverLinha = (celulas: string[]) => {
        const completas = [...celulas];
        while (completas.length < colunas) completas.push("");
        state.write(`| ${completas.join(" | ")} |`);
        state.ensureNewLine();
      };

      linhas.forEach((linha, indice) => {
        const celulas: string[] = [];
        for (let c = 0; c < linha.childCount; c++) {
          celulas.push(textoDaCelula(state, linha.child(c)));
        }
        escreverLinha(celulas);
        // O separador vem sempre depois da primeira linha. Se a tabela nao
        // tiver cabecalho, a primeira linha vira cabecalho na volta — o GFM
        // simplesmente nao representa tabela sem cabecalho.
        if (indice === 0) {
          escreverLinha(Array.from({ length: colunas }, () => "---"));
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
    // As chaves sao os nomes das marcas NO SCHEMA. O TipTap batiza de
    // italic/bold o que o CommonMark chama de em/strong; com as chaves
    // antigas o serializer nao achava a marca e recusava o documento
    // ("Mark type `bold` not supported"), entao sair do modo Notion com
    // qualquer negrito na pagina quebrava.
    italic: {
      open: "*",
      close: "*",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    bold: {
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
  }
);

// ==========================================
// Parser: Markdown → TipTap JSON
// ==========================================

const md = MarkdownIt("commonmark", { html: true }).enable("table").enable("strikethrough");

const CAIXA = /^\[([ xX])\]\s+/;
const COMENTARIO_CARD = /<!--\s*card:([a-f0-9-]+)\s*-->/;

/** Indice do token que fecha o bloco aberto em `abertura`. */
function acharFechamento(tokens: Token[], abertura: number): number {
  let nivel = 0;
  for (let i = abertura; i < tokens.length; i++) {
    nivel += tokens[i].nesting;
    if (nivel === 0) return i;
  }
  return -1;
}

/** Indices dos `list_item_open` que sao filhos DIRETOS da lista. */
function itensDiretos(tokens: Token[], abreLista: number, fechaLista: number) {
  const itens: number[] = [];
  let nivel = 0;
  for (let i = abreLista + 1; i < fechaLista; i++) {
    if (tokens[i].type === "list_item_open" && nivel === 0) itens.push(i);
    nivel += tokens[i].nesting;
  }
  return itens;
}

/**
 * Lista de tarefas: `- [x] feito` vira taskList/taskItem.
 *
 * A versao anterior so gravava `data-checked` no `list_item_open`, mas o
 * parser nunca leu esse atributo — nao havia mapeamento para taskList nem
 * taskItem. As tarefas voltavam como lista comum com o texto literal
 * `\[x\] feito`, a marcacao virando texto escapado a cada ida e volta.
 *
 * Ela tambem limpava so `token.content`; o prosemirror-markdown le
 * `token.children`, entao o prefixo continuava aparecendo.
 *
 * So converte a lista quando TODOS os itens diretos sao tarefas —
 * taskList aceita apenas taskItem, e uma lista misturada viraria um nó
 * invalido (ou seja, sumiria). Misturada fica como lista comum.
 */
function taskListPlugin(mdi: MarkdownIt) {
  mdi.core.ruler.after("inline", "task-list", (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "bullet_list_open") continue;
      const fechaLista = acharFechamento(tokens, i);
      if (fechaLista < 0) continue;

      const itens = itensDiretos(tokens, i, fechaLista);
      // O inline do item fica em item+2 (list_item_open, paragraph_open, inline).
      const inlines = itens.map((idx) => tokens[idx + 2]);
      const todasTarefas = itens.length > 0 && inlines.every((t) => t?.type === "inline" && CAIXA.test(t.content));
      if (!todasTarefas) continue;

      tokens[i].type = "task_list_open";
      tokens[fechaLista].type = "task_list_close";

      itens.forEach((idx, n) => {
        const inline = inlines[n];
        const marcado = CAIXA.exec(inline.content)![1] !== " ";
        inline.content = inline.content.replace(CAIXA, "");
        const primeiro = inline.children?.[0];
        if (primeiro?.type === "text") {
          primeiro.content = primeiro.content.replace(CAIXA, "");
        }
        const fechaItem = acharFechamento(tokens, idx);
        tokens[idx].type = "task_item_open";
        tokens[idx].attrSet("data-checked", String(marcado));
        if (fechaItem >= 0) tokens[fechaItem].type = "task_item_close";
      });
    }
  });
}

/**
 * Reconcilia tres tipos de token que o schema do TipTap nao aceita da forma
 * como o markdown-it os entrega. Todos os tres perdiam conteudo em silencio
 * ou derrubavam a conversao inteira.
 *
 * IMAGEM — `image` chega como token INLINE, mas no schema o no `image` e de
 * bloco. Dentro do paragrafo ele nao encaixa, e o ProseMirror descartava:
 * `![alt](url)` virava paragrafo vazio. Imagem sozinha na linha vira um
 * token de bloco proprio; imagem no meio de uma frase nao tem como virar
 * bloco sem partir o paragrafo, entao vira link — perde a miniatura, mas
 * preserva a URL.
 *
 * HTML INLINE — sem mapeamento, e token desconhecido ABORTA o parser
 * ("Token type `html_inline` not supported"). Um `<b>` digitado no meio do
 * texto derrubava a conversao inteira. Vira texto literal.
 *
 * HTML EM BLOCO — so `<!-- card:uuid -->` e embed de cartao. Qualquer outro
 * HTML tambem casava com a regra, virava um cardEmbed sem cardId e o
 * serializer o omitia: o bloco DESAPARECIA. Agora so o comentario de cartao
 * segue como cardEmbed; o resto vira paragrafo de texto.
 */
function htmlEImagemPlugin(mdi: MarkdownIt) {
  mdi.core.ruler.push("html-e-imagem", (state) => {
    const tokens = state.tokens;

    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];

      if (token.type === "html_block" && !COMENTARIO_CARD.test(token.content)) {
        const bruto = token.content.trim();
        const texto = new state.Token("text", "", 0);
        texto.content = bruto;
        const inline = new state.Token("inline", "", 0);
        inline.content = bruto;
        inline.children = [texto];
        tokens.splice(
          i,
          1,
          new state.Token("paragraph_open", "p", 1),
          inline,
          new state.Token("paragraph_close", "p", -1)
        );
        continue;
      }

      if (token.type !== "inline") continue;
      const filhos = token.children ?? [];

      for (const filho of filhos) {
        if (filho.type === "html_inline") filho.type = "text";
      }

      const visiveis = filhos.filter((f) => !(f.type === "text" && f.content.trim() === ""));
      const sozinha =
        visiveis.length === 1 &&
        visiveis[0].type === "image" &&
        tokens[i - 1]?.type === "paragraph_open" &&
        tokens[i + 1]?.type === "paragraph_close";

      if (sozinha) {
        const imagem = visiveis[0];
        const bloco = new state.Token("image_block", "", 0);
        bloco.attrSet("src", imagem.attrGet("src") ?? "");
        bloco.attrSet("alt", imagem.children?.[0]?.content ?? "");
        tokens.splice(i - 1, 3, bloco);
        continue;
      }

      // Sobrou imagem no meio do texto: vira link, senao o parser a descarta.
      for (let j = filhos.length - 1; j >= 0; j--) {
        if (filhos[j].type !== "image") continue;
        const imagem = filhos[j];
        const src = imagem.attrGet("src") ?? "";
        const alt = imagem.children?.[0]?.content || src;

        const abre = new state.Token("link_open", "a", 1);
        abre.attrSet("href", src);
        const texto = new state.Token("text", "", 0);
        texto.content = alt;
        const fecha = new state.Token("link_close", "a", -1);
        filhos.splice(j, 1, abre, texto, fecha);
      }
    }
  });
}

/**
 * Envolve o conteudo de cada celula (`th`/`td`) num paragrafo.
 *
 * ESTE PLUGIN CONSERTA UMA PERDA DE DADOS. O markdown-it emite a celula
 * como `th_open`, `inline`, `th_close` — o texto fica direto dentro da
 * celula. Mas no schema do TipTap a celula aceita `block+`, ou seja, exige
 * um paragrafo; texto solto nao serve. O `createAndFill` do ProseMirror
 * entao nao consegue montar a celula, devolve null e ela e DESCARTADA — nao
 * so o texto, a celula toda. A tabela sobrevivia como um punhado de
 * `tableRow` vazios, e a volta para markdown rendia linhas `|  |`.
 *
 * Roda no fim do encadeamento (`push`), depois do task-list, e percorre de
 * tras para frente para que os splices nao desloquem o que ainda falta ver.
 */
function paragrafoNaCelulaPlugin(mdi: MarkdownIt) {
  mdi.core.ruler.push("celula-com-paragrafo", (state) => {
    const tokens = state.tokens;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const tipo = tokens[i].type;
      if (tipo !== "th_open" && tipo !== "td_open") continue;

      const fechamento = tipo === "th_open" ? "th_close" : "td_close";
      let fim = i + 1;
      while (fim < tokens.length && tokens[fim].type !== fechamento) fim++;

      // Ordem importa: fecha primeiro, senao o indice `fim` se desloca.
      tokens.splice(fim, 0, new state.Token("paragraph_close", "p", -1));
      tokens.splice(i + 1, 0, new state.Token("paragraph_open", "p", 1));
    }
  });
}

md.use(taskListPlugin);
md.use(htmlEImagemPlugin);
md.use(paragrafoNaCelulaPlugin);

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
    // `image_block` e sintetico, criado por htmlEImagemPlugin. O token
    // `image` do markdown-it e inline e nao serve aqui — ver o plugin.
    image_block: {
      node: "image",
      getAttrs: (tok) => ({
        src: tok.attrGet("src") || "",
        alt: tok.attrGet("alt") || "",
      }),
    },
    hardbreak: { node: "hardBreak" },
    // Os nomes sao os do SCHEMA (TipTap), nao os do CommonMark. O TipTap
    // chama de bold/italic o que o markdown-it emite como strong/em; apontar
    // para "strong"/"em" buscava marca inexistente e ESTOURAVA o parser com
    // "Cannot read properties of undefined (reading 'create')" — qualquer
    // **negrito** ou *italico* derrubava a conversao inteira.
    em: { mark: "italic" },
    strong: { mark: "bold" },
    task_list: { block: "taskList" },
    task_item: {
      block: "taskItem",
      getAttrs: (tok) => ({ checked: tok.attrGet("data-checked") === "true" }),
    },
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
export function tiptapJsonToMarkdown(json: Record<string, unknown>): string {
  const schema = getWikiSchema();
  const doc = ProsemirrorNode.fromJSON(schema, json);
  // tightLists: o padrao do prosemirror-markdown e "solto", que poe uma
  // linha em branco entre os itens. Ninguem escreve lista assim, e como o
  // modo Markdown salva a cada tecla, a lista do usuario ganhava espaco a
  // cada visita.
  return wikiSerializer.serialize(doc, { tightLists: true });
}

/**
 * Converte string Markdown para TipTap JSON.
 */
export function markdownToTiptapJson(markdown: string): Record<string, unknown> {
  const parser = getParser();

  // Pre-process: card embeds are HTML comments, ensure they're on their own line
  const processed = markdown.replace(/<!--\s*card:([a-f0-9-]+)\s*-->/g, "\n<!-- card:$1 -->\n");

  const doc = parser.parse(processed);
  if (!doc) {
    // Fallback: return empty doc
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  return doc.toJSON() as Record<string, unknown>;
}
