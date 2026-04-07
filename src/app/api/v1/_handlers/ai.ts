import { NextResponse } from "next/server";
import { getBody, type ApiKeyAuth } from "../_lib/helpers";

export async function handleAIGenerateCards(
  auth: ApiKeyAuth,
  request: Request
) {
  const body = await getBody(request);
  if (!body?.texto)
    return NextResponse.json({ error: "texto obrigatorio" }, { status: 400 });

  // Forward para a rota interna existente
  const internalUrl = new URL("/api/ai/generate-cards", request.url);
  const res = await fetch(internalUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Passar auth como header interno
      "x-mcp-user-id": auth.userId,
      "x-mcp-workspace-id": auth.workspaceId,
    },
    body: JSON.stringify({ ...body, workspaceId: auth.workspaceId }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function handleAIEnhanceCard(
  auth: ApiKeyAuth,
  request: Request
) {
  const body = await getBody(request);
  if (!body?.cardId)
    return NextResponse.json({ error: "cardId obrigatorio" }, { status: 400 });

  const internalUrl = new URL("/api/ai/enhance-card", request.url);
  const res = await fetch(internalUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mcp-user-id": auth.userId,
      "x-mcp-workspace-id": auth.workspaceId,
    },
    body: JSON.stringify({ ...body, workspaceId: auth.workspaceId }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
