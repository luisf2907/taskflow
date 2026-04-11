import { NextResponse } from "next/server";
import type { ApiKeyAuth } from "@/lib/mcp-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

export type { ApiKeyAuth };

export type Handler = (
  auth: ApiKeyAuth,
  request: Request,
  params: string[]
) => Promise<NextResponse>;

type Service = ReturnType<typeof createServiceClient>;

export function getService() {
  return createServiceClient();
}

export async function getBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getSearchParams(request: Request) {
  return new URL(request.url).searchParams;
}

export async function getGitHubToken(service: Service, userId: string) {
  const { data } = await service
    .from("github_tokens")
    .select("provider_token, encrypted_token")
    .eq("user_id", userId)
    .single();
  if (!data) return null;

  // Tentar decriptar encrypted_token primeiro (se ENCRYPTION_KEY configurada)
  if (data.encrypted_token) {
    const decrypted = await decrypt(data.encrypted_token);
    if (decrypted) return decrypted;
  }

  // Fallback para provider_token plaintext (backward compat / sem ENCRYPTION_KEY)
  return data.provider_token && data.provider_token !== ""
    ? data.provider_token
    : null;
}

// =============================================
// Ownership guards — garantem que o recurso pertence ao workspace do auth.
// Usam service role (bypassa RLS), entao a checagem e obrigatoria.
// =============================================

const NOT_FOUND = (entity: string) =>
  NextResponse.json({ error: `${entity} nao encontrado` }, { status: 404 });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/**
 * Busca um cartao garantindo que pertence ao workspace.
 * Retorna NextResponse (404) se nao existir ou nao pertencer.
 */
export async function assertCard(
  service: Service,
  cardId: string,
  workspaceId: string,
  select = "*"
): Promise<NextResponse | Row> {
  const { data } = await service
    .from("cartoes")
    .select(select)
    .eq("id", cardId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!data) return NOT_FOUND("Card");
  return data as Row;
}

/**
 * Busca um quadro (sprint) garantindo que pertence ao workspace.
 */
export async function assertSprint(
  service: Service,
  sprintId: string,
  workspaceId: string,
  select = "*"
): Promise<NextResponse | Row> {
  const { data } = await service
    .from("quadros")
    .select(select)
    .eq("id", sprintId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!data) return NOT_FOUND("Sprint");
  return data as Row;
}

/**
 * Valida que um checklist_item pertence a um cartao do workspace.
 * Faz join: checklist_itens -> checklists -> cartoes.workspace_id
 */
export async function assertChecklistItem(
  service: Service,
  itemId: string,
  workspaceId: string
): Promise<NextResponse | Row> {
  const { data: item } = await service
    .from("checklist_itens")
    .select("id, concluido, checklist_id")
    .eq("id", itemId)
    .single();
  if (!item) return NOT_FOUND("Item");

  const { data: checklist } = await service
    .from("checklists")
    .select("cartao_id")
    .eq("id", item.checklist_id)
    .single();
  if (!checklist) return NOT_FOUND("Item");

  const { data: card } = await service
    .from("cartoes")
    .select("id")
    .eq("id", checklist.cartao_id)
    .eq("workspace_id", workspaceId)
    .single();
  if (!card) return NOT_FOUND("Item");

  return item as Row;
}

/**
 * Busca uma pagina wiki garantindo que pertence ao workspace.
 */
export async function assertWikiPage(
  service: Service,
  pageId: string,
  workspaceId: string,
  select = "*"
): Promise<NextResponse | Row> {
  const { data } = await service
    .from("wiki_paginas")
    .select(select)
    .eq("id", pageId)
    .eq("workspace_id", workspaceId)
    .single();
  if (!data) return NOT_FOUND("Wiki page");
  return data as Row;
}

/** Type guard: verifica se o resultado e uma NextResponse (erro). */
export function isErrorResponse(
  result: NextResponse | Row
): result is NextResponse {
  return result instanceof NextResponse;
}
