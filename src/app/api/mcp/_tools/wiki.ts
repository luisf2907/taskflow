import { callV1, type ToolDef } from "../_lib/types";

export const wikiTools: ToolDef[] = [
  {
    name: "list_wiki_pages",
    description: "Listar paginas da wiki do workspace",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (_params, apiKey, baseUrl) => {
      const res = await callV1("GET", "wiki", apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "get_wiki_page",
    description:
      "Ver detalhes de uma pagina da wiki (conteudo, titulo, slug)",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "ID da pagina" },
      },
      required: ["page_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1(
        "GET",
        `wiki/${params.page_id}`,
        apiKey,
        baseUrl,
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "create_wiki_page",
    description:
      "Criar nova pagina na wiki. Pode ser raiz ou sub-pagina.",
    inputSchema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Titulo da pagina" },
        parent_id: {
          type: "string",
          description: "ID da pagina pai (opcional, se omitido cria na raiz)",
        },
        conteudo: {
          type: "object",
          description:
            "Conteudo da pagina em formato TipTap JSON (opcional)",
        },
        icone: {
          type: "string",
          description: "Emoji para icone da pagina (ex: '📄')",
        },
      },
      required: ["titulo"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "wiki", apiKey, baseUrl, {
        titulo: params.titulo,
        parent_id: params.parent_id || null,
        conteudo: params.conteudo || null,
        icone: params.icone || null,
      });
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "update_wiki_page",
    description:
      "Atualizar pagina da wiki (titulo, conteudo, icone, posicao)",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "ID da pagina" },
        titulo: { type: "string", description: "Novo titulo" },
        conteudo: {
          type: "object",
          description: "Novo conteudo em formato TipTap JSON",
        },
        icone: { type: "string", description: "Novo icone (emoji)" },
        parent_id: {
          type: "string",
          description: "Novo parent_id (mover pagina)",
        },
        posicao: {
          type: "number",
          description: "Nova posicao entre siblings",
        },
      },
      required: ["page_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const { page_id, ...body } = params;
      const res = await callV1(
        "PATCH",
        `wiki/${page_id}`,
        apiKey,
        baseUrl,
        body,
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "delete_wiki_page",
    description:
      "Excluir pagina da wiki. Sub-paginas ficarao como raiz (nao sao excluidas em cascata).",
    inputSchema: {
      type: "object",
      properties: {
        page_id: { type: "string", description: "ID da pagina" },
      },
      required: ["page_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1(
        "DELETE",
        `wiki/${params.page_id}`,
        apiKey,
        baseUrl,
      );
      return JSON.stringify(res, null, 2);
    },
  },
];
