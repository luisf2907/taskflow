import { callV1, type ToolDef } from "../_lib/types";

export const repoTools: ToolDef[] = [
  {
    name: "list_repos",
    description: "Listar repositorios GitHub conectados ao workspace",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async (_, apiKey, baseUrl) => {
      const res = await callV1("GET", "repos", apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "list_prs",
    description: "Listar Pull Requests de um repositorio",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Dono do repo" },
        repo: { type: "string", description: "Nome do repo" },
      },
      required: ["owner", "repo"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1(
        "GET",
        `repos/${params.owner}/${params.repo}/prs`,
        apiKey,
        baseUrl
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "list_branches",
    description: "Listar branches de um repositorio",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Dono do repo" },
        repo: { type: "string", description: "Nome do repo" },
      },
      required: ["owner", "repo"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1(
        "GET",
        `repos/${params.owner}/${params.repo}/branches`,
        apiKey,
        baseUrl
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "create_pr",
    description: "Abrir Pull Request no GitHub, opcionalmente vinculado a um card",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repo (ex: luisf2907/taskflow)" },
        head: { type: "string", description: "Branch de origem" },
        base: { type: "string", description: "Branch destino" },
        title: { type: "string", description: "Titulo do PR" },
        body: { type: "string", description: "Descricao do PR" },
        card_id: { type: "string", description: "ID do card para vincular" },
      },
      required: ["repo", "head", "base", "title"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "prs", apiKey, baseUrl, params);
      return JSON.stringify(res.data, null, 2);
    },
  },
];
