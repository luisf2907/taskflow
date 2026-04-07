import { callV1, type ToolDef } from "../_lib/types";

export const sprintTools: ToolDef[] = [
  {
    name: "list_sprints",
    description: "Listar sprints do workspace",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async (_, apiKey, baseUrl) => {
      const res = await callV1("GET", "sprints", apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "get_sprint_summary",
    description:
      "Resumo da sprint: cards, pontos planejados vs entregues, cards por coluna",
    inputSchema: {
      type: "object",
      properties: {
        sprint_id: { type: "string", description: "ID da sprint" },
      },
      required: ["sprint_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1(
        "GET",
        `sprints/${params.sprint_id}/summary`,
        apiKey,
        baseUrl
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "create_sprint",
    description: "Criar nova sprint",
    inputSchema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome da sprint" },
        data_inicio: { type: "string", description: "Data inicio (YYYY-MM-DD)" },
        data_fim: { type: "string", description: "Data fim (YYYY-MM-DD)" },
        meta: { type: "string", description: "Objetivo da sprint" },
      },
      required: ["nome"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "sprints", apiKey, baseUrl, params);
      return JSON.stringify(res.data, null, 2);
    },
  },
];
