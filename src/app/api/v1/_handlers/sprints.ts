import { NextResponse } from "next/server";
import {
  getService,
  getBody,
  assertSprint,
  isErrorResponse,
  type ApiKeyAuth,
} from "../_lib/helpers";

export async function handleListSprints(auth: ApiKeyAuth) {
  const service = getService();
  const { data } = await service
    .from("quadros")
    .select("*")
    .eq("workspace_id", auth.workspaceId)
    .order("criado_em", { ascending: false });

  return NextResponse.json({ data: data || [] });
}

export async function handleSprintSummary(
  auth: ApiKeyAuth,
  _req: Request,
  params: string[]
) {
  const [sprintId] = params;
  const service = getService();

  const sprint = await assertSprint(service, sprintId, auth.workspaceId);
  if (isErrorResponse(sprint)) return sprint;

  const { data: colunas } = await service
    .from("colunas")
    .select("id, nome, posicao")
    .eq("quadro_id", sprintId)
    .order("posicao");

  if (!colunas || colunas.length === 0) {
    return NextResponse.json({
      data: { sprint, colunas: [], total_cards: 0, total_pontos: 0 },
    });
  }

  const colIds = colunas.map((c) => c.id);
  const { data: cards } = await service
    .from("cartoes")
    .select("id, titulo, peso, coluna_id")
    .in("coluna_id", colIds);

  const cardsList = cards || [];
  const ultimaColuna = colunas[colunas.length - 1].id;

  const colunasComCards = colunas.map((col) => ({
    ...col,
    cards: cardsList.filter((c) => c.coluna_id === col.id).length,
    pontos: cardsList
      .filter((c) => c.coluna_id === col.id)
      .reduce((s, c) => s + (c.peso || 0), 0),
  }));

  const concluidos = cardsList.filter((c) => c.coluna_id === ultimaColuna);

  return NextResponse.json({
    data: {
      sprint,
      colunas: colunasComCards,
      total_cards: cardsList.length,
      total_pontos: cardsList.reduce((s, c) => s + (c.peso || 0), 0),
      concluidos: concluidos.length,
      pontos_concluidos: concluidos.reduce((s, c) => s + (c.peso || 0), 0),
    },
  });
}

export async function handleSprintColumns(
  auth: ApiKeyAuth,
  _req: Request,
  params: string[]
) {
  const [sprintId] = params;
  const service = getService();

  // Validar que o sprint pertence ao workspace
  const sprint = await assertSprint(service, sprintId, auth.workspaceId, "id");
  if (isErrorResponse(sprint)) return sprint;

  const { data } = await service
    .from("colunas")
    .select("*")
    .eq("quadro_id", sprintId)
    .order("posicao");

  return NextResponse.json({ data: data || [] });
}

export async function handleCreateSprint(auth: ApiKeyAuth, request: Request) {
  const body = await getBody(request);
  if (!body?.nome)
    return NextResponse.json({ error: "nome obrigatorio" }, { status: 400 });

  const service = getService();
  const { data, error } = await service
    .from("quadros")
    .insert({
      nome: body.nome,
      workspace_id: auth.workspaceId,
      cor: body.cor || "#3B82F6",
      status_sprint: body.status || "planejada",
      data_inicio: body.data_inicio || null,
      data_fim: body.data_fim || null,
      meta: body.meta || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Criar colunas padrao
  const { data: ws } = await service
    .from("workspaces")
    .select("colunas_padrao")
    .eq("id", auth.workspaceId)
    .single();
  const colsPadrao = ws?.colunas_padrao || [
    "A fazer",
    "Em progresso",
    "Concluido",
  ];

  if (data) {
    await service.from("colunas").insert(
      colsPadrao.map((nome: string, i: number) => ({
        quadro_id: data.id,
        nome,
        posicao: i,
      }))
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function handleUpdateSprint(
  auth: ApiKeyAuth,
  request: Request,
  params: string[]
) {
  const [id] = params;
  const body = await getBody(request);
  if (!body)
    return NextResponse.json({ error: "Body obrigatorio" }, { status: 400 });

  const service = getService();
  const campos: Record<string, unknown> = {};
  if (body.nome !== undefined) campos.nome = body.nome;
  if (body.status_sprint !== undefined) campos.status_sprint = body.status_sprint;
  if (body.data_inicio !== undefined) campos.data_inicio = body.data_inicio;
  if (body.data_fim !== undefined) campos.data_fim = body.data_fim;
  if (body.meta !== undefined) campos.meta = body.meta;
  campos.atualizado_em = new Date().toISOString();

  const { data, error } = await service
    .from("quadros")
    .update(campos)
    .eq("id", id)
    .eq("workspace_id", auth.workspaceId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json({ error: "Sprint nao encontrada" }, { status: 404 });
  return NextResponse.json({ data });
}
