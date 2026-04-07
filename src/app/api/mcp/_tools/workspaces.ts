import { callV1, type ToolDef } from "../_lib/types";

export const workspaceTools: ToolDef[] = [
  {
    name: "list_workspaces",
    description: "Listar workspaces acessiveis com esta API key",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async (_, apiKey, baseUrl) => {
      const res = await callV1("GET", "workspaces", apiKey, baseUrl);
      return JSON.stringify(res.data, null, 2);
    },
  },
];
