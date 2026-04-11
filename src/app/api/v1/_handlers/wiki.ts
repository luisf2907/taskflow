import { NextResponse } from "next/server";
import {
  getService,
  getBody,
  assertWikiPage,
  isErrorResponse,
  type ApiKeyAuth,
} from "../_lib/helpers";

// Slugify simples (server-side)
function slugify(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "sem-titulo";
}

// =============================================
// LIST — GET /api/v1/wiki
// =============================================
export async function handleListWikiPages(
  auth: ApiKeyAuth,
  _request: Request,
  _params: string[]
): Promise<NextResponse> {
  const service = getService();

  const { data, error } = await service
    .from("wiki_paginas")
    .select("id, workspace_id, parent_id, titulo, slug, icone, posicao, criado_por, atualizado_por, criado_em, atualizado_em")
    .eq("workspace_id", auth.workspaceId)
    .order("posicao");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

// =============================================
// GET — GET /api/v1/wiki/:id
// =============================================
export async function handleGetWikiPage(
  auth: ApiKeyAuth,
  _request: Request,
  params: string[]
): Promise<NextResponse> {
  const pageId = params[0];
  const service = getService();

  const result = await assertWikiPage(service, pageId, auth.workspaceId);
  if (isErrorResponse(result)) return result;

  return NextResponse.json({ data: result });
}

// =============================================
// CREATE — POST /api/v1/wiki
// =============================================
export async function handleCreateWikiPage(
  auth: ApiKeyAuth,
  request: Request,
  _params: string[]
): Promise<NextResponse> {
  const body = await getBody(request);
  if (!body?.titulo) {
    return NextResponse.json({ error: "titulo obrigatorio" }, { status: 400 });
  }

  const service = getService();

  // Gerar slug único
  let slug = slugify(body.titulo);
  const { data: existentes } = await service
    .from("wiki_paginas")
    .select("slug")
    .eq("workspace_id", auth.workspaceId);

  const slugsExistentes = (existentes || []).map((e: { slug: string }) => e.slug);
  if (slugsExistentes.includes(slug)) {
    let i = 2;
    while (slugsExistentes.includes(`${slug}-${i}`)) i++;
    slug = `${slug}-${i}`;
  }

  // Calcular posicao
  const parentId = body.parent_id || null;
  const { count } = await service
    .from("wiki_paginas")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", auth.workspaceId)
    .eq("parent_id", parentId);

  const { data, error } = await service
    .from("wiki_paginas")
    .insert({
      workspace_id: auth.workspaceId,
      parent_id: parentId,
      titulo: body.titulo,
      slug,
      icone: body.icone || null,
      conteudo: body.conteudo || null,
      posicao: count || 0,
      criado_por: auth.userId,
      atualizado_por: auth.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// =============================================
// UPDATE — PATCH /api/v1/wiki/:id
// =============================================
export async function handleUpdateWikiPage(
  auth: ApiKeyAuth,
  request: Request,
  params: string[]
): Promise<NextResponse> {
  const pageId = params[0];
  const body = await getBody(request);
  if (!body) {
    return NextResponse.json({ error: "body vazio" }, { status: 400 });
  }

  const service = getService();

  const result = await assertWikiPage(service, pageId, auth.workspaceId);
  if (isErrorResponse(result)) return result;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    atualizado_por: auth.userId,
    atualizado_em: new Date().toISOString(),
  };

  if (body.titulo !== undefined) {
    updateData.titulo = body.titulo;
    // Regenerar slug
    let slug = slugify(body.titulo);
    const { data: existentes } = await service
      .from("wiki_paginas")
      .select("slug")
      .eq("workspace_id", auth.workspaceId)
      .neq("id", pageId);

    const slugsExistentes = (existentes || []).map((e: { slug: string }) => e.slug);
    if (slugsExistentes.includes(slug)) {
      let i = 2;
      while (slugsExistentes.includes(`${slug}-${i}`)) i++;
      slug = `${slug}-${i}`;
    }
    updateData.slug = slug;
  }

  if (body.conteudo !== undefined) updateData.conteudo = body.conteudo;
  if (body.icone !== undefined) updateData.icone = body.icone;
  if (body.capa_url !== undefined) updateData.capa_url = body.capa_url;
  if (body.parent_id !== undefined) updateData.parent_id = body.parent_id;
  if (body.posicao !== undefined) updateData.posicao = body.posicao;

  const { data, error } = await service
    .from("wiki_paginas")
    .update(updateData)
    .eq("id", pageId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// =============================================
// DELETE — DELETE /api/v1/wiki/:id
// =============================================
export async function handleDeleteWikiPage(
  auth: ApiKeyAuth,
  _request: Request,
  params: string[]
): Promise<NextResponse> {
  const pageId = params[0];
  const service = getService();

  const result = await assertWikiPage(service, pageId, auth.workspaceId);
  if (isErrorResponse(result)) return result;

  const { error } = await service
    .from("wiki_paginas")
    .delete()
    .eq("id", pageId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
