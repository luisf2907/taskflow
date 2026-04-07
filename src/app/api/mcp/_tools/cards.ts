import { callV1, type ToolDef } from "../_lib/types";

export const cardTools: ToolDef[] = [
  {
    name: "list_cards",
    description:
      "Listar cards do workspace. Filtros: status (backlog|sprint|all), sprint_id",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["backlog", "sprint", "all"],
          description: "Filtrar por status",
        },
        sprint_id: { type: "string", description: "ID da sprint para filtrar" },
      },
    },
    handler: async (params, apiKey, baseUrl) => {
      const qs = new URLSearchParams();
      if (params.status && params.status !== "all")
        qs.set("status", params.status as string);
      if (params.sprint_id) qs.set("sprint_id", params.sprint_id as string);
      const q = qs.toString();
      const res = await callV1(
        "GET",
        `cards${q ? "?" + q : ""}`,
        apiKey,
        baseUrl
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "get_card",
    description: "Ver detalhes de um card (descricao, checklists, etiquetas)",
    inputSchema: {
      type: "object",
      properties: { card_id: { type: "string", description: "ID do card" } },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1(
        "GET",
        `cards/${params.card_id}`,
        apiKey,
        baseUrl
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "create_card",
    description:
      "Criar um novo card no backlog. Use esta tool diretamente para criar cards — voce mesmo define titulo, descricao, etiquetas e checklists. NAO use generate_cards ou enhance_card para isso, essas sao para o usuario do app usar via IA Gemini.",
    inputSchema: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Titulo do card" },
        descricao: {
          type: "string",
          description: "Descricao do card (user story, contexto tecnico)",
        },
        peso: {
          type: "number",
          description: "Story points (fibonacci: 1,2,3,5,8,13,21)",
        },
        etiquetas: {
          type: "array",
          items: { type: "string" },
          description:
            "Nomes de etiquetas (ex: ['bug', 'frontend', 'urgente']). Cria automaticamente se nao existir no workspace.",
        },
        checklists: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: {
                type: "string",
                description: "Titulo do checklist (ex: 'Criterios de Aceitacao')",
              },
              itens: {
                type: "array",
                items: { type: "string" },
                description: "Itens do checklist",
              },
            },
            required: ["titulo", "itens"],
          },
          description:
            "Checklists com itens (ex: criterios de aceitacao, tarefas tecnicas)",
        },
      },
      required: ["titulo"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const res = await callV1("POST", "cards", apiKey, baseUrl, params);
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "update_card",
    description:
      "Atualizar campos de um card existente (titulo, descricao, peso). Pode ADICIONAR novas etiquetas e NOVOS checklists. ATENCAO: para marcar itens de checklist como concluidos, use toggle_checklist_item — esta tool NAO modifica checklists existentes, apenas adiciona novos.",
    inputSchema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "ID do card" },
        titulo: { type: "string", description: "Novo titulo" },
        descricao: { type: "string", description: "Nova descricao" },
        peso: { type: "number", description: "Novos story points" },
        etiquetas: {
          type: "array",
          items: { type: "string" },
          description: "Nomes de etiquetas para adicionar (cria se nao existir)",
        },
        checklists: {
          type: "array",
          items: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              itens: { type: "array", items: { type: "string" } },
            },
            required: ["titulo", "itens"],
          },
          description: "Checklists para adicionar ao card",
        },
      },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const { card_id, ...campos } = params;
      const res = await callV1(
        "PATCH",
        `cards/${card_id}`,
        apiKey,
        baseUrl,
        campos
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "toggle_checklist_item",
    description:
      "Marcar/desmarcar um item de checklist como concluido. IMPORTANTE: Esta e a UNICA forma de marcar itens como feitos. Use get_card primeiro para ver os checklist_itens com seus IDs. NAO use update_card para marcar itens — update_card so ADICIONA checklists novos.",
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "ID do item de checklist" },
        concluido: {
          type: "boolean",
          description:
            "true para marcar como feito, false para desmarcar. Se omitido, faz toggle.",
        },
      },
      required: ["item_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const body: Record<string, unknown> = {};
      if (typeof params.concluido === "boolean")
        body.concluido = params.concluido;
      const res = await callV1(
        "PATCH",
        `checklist-items/${params.item_id}`,
        apiKey,
        baseUrl,
        body
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "move_card",
    description: "Mover card entre colunas, sprints ou backlog",
    inputSchema: {
      type: "object",
      properties: {
        card_id: { type: "string", description: "ID do card" },
        coluna_id: { type: "string", description: "ID da coluna destino" },
        sprint_id: { type: "string", description: "ID da sprint destino" },
        backlog: { type: "boolean", description: "Mover de volta pro backlog" },
      },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      const { card_id, ...body } = params;
      const res = await callV1(
        "POST",
        `cards/${card_id}/move`,
        apiKey,
        baseUrl,
        body
      );
      return JSON.stringify(res.data, null, 2);
    },
  },
  {
    name: "delete_card",
    description: "Excluir um card",
    inputSchema: {
      type: "object",
      properties: { card_id: { type: "string", description: "ID do card" } },
      required: ["card_id"],
    },
    handler: async (params, apiKey, baseUrl) => {
      await callV1("DELETE", `cards/${params.card_id}`, apiKey, baseUrl);
      return "Card excluido com sucesso";
    },
  },
];
