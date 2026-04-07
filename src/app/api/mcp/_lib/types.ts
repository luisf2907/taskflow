// =============================================================================
// MCP — tipos compartilhados e helper de chamada para a API v1 interna.
// =============================================================================

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (
    params: Record<string, unknown>,
    apiKey: string,
    baseUrl: string
  ) => Promise<string>;
}

export async function callV1(
  method: string,
  path: string,
  apiKey: string,
  baseUrl: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `${baseUrl}/api/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json();
}
