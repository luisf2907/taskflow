import { callV1, type ToolDef } from "../_lib/types";

export const aiTools: ToolDef[] = [
  {
    name: "generate_cards",
    description:
      "Usar IA Gemini para quebrar texto livre em multiplos cards (uso interno do app). Prefira criar cards diretamente com create_card se voce ja sabe os detalhes.",
    inputSchema: {
      type: "object",
      properties: {
        texto: { type: "string", description: "Texto descrevendo as tarefas" },
      },
      required: ["texto"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1(
        "POST",
        "ai/generate-cards",
        apiKey,
        baseUrl,
        params
      );
      return JSON.stringify(res, null, 2);
    },
  },
  {
    name: "enhance_card",
    description:
      "Usar IA Gemini para melhorar um card existente (uso interno do app). Prefira update_card se voce mesmo quer editar o card.",
    inputSchema: {
      type: "object",
      properties: { card_id: { type: "string", description: "ID do card" } },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "ai/enhance-card", apiKey, baseUrl, {
        cardId: params.card_id,
      });
      return JSON.stringify(res, null, 2);
    },
  },
];
