import { callV1, type ToolDef } from "../_lib/types";

export const workTools: ToolDef[] = [
  {
    name: "start_work",
    description:
      "Iniciar trabalho em um card: cria branch no GitHub e move para Em Progresso",
    inputSchema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "ID do card" },
        repo: { type: "string", description: "Repo para criar branch" },
        base: { type: "string", description: "Branch base (padrao: main)" },
      },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const { card_id, ...body } = params;
      const res = await callV1(
        "POST",
        `cards/${card_id}/start-work`,
        apiKey,
        baseUrl,
        body
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "finish_work",
    description: "Finalizar trabalho: abre PR no GitHub e move card para Em Review",
    inputSchema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "ID do card" },
        repo: { type: "string", description: "Repo" },
        base: { type: "string", description: "Branch destino do PR (padrao: main)" },
      },
      required: ["card_id", "repo"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const { card_id, ...body } = params;
      const res = await callV1(
        "POST",
        `cards/${card_id}/finish-work`,
        apiKey,
        baseUrl,
        body
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
];
