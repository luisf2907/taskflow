import { NextResponse } from "next/server";
import {
  getService,
  getBody,
  getSearchParams,
  type ApiKeyAuth,
} from "../_lib/helpers";

const ETIQUETA_CORES = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#EC4899",
];

// =============================================
// Helper interno: resolve etiquetas por nome (cria as faltantes) e
// vincula ao cartao. Usado tanto no create quanto no update.
// =============================================
async function resolverEVincularEtiquetas(
  service: ReturnType<typeof getService>,
  workspaceId: string,
  cartaoId: string,
  etiquetas: string[]
) {
  const nomes = etiquetas.map((n) => n.trim()).filter(Boolean);
  if (nomes.length === 0) return;

  const { data: existentes } = await service
    .from("etiquetas")
    .select("id, nome")
    .eq("workspace_id", workspaceId)
    .in("nome", nomes);

  const mapa = new Map((existentes || []).map((e) => [e.nome, e.id]));
  const novas = nomes.filter((n) => !mapa.has(n));

  if (novas.length > 0) {
    const { data: criadas } = await service
      .from("etiquetas")
      .upsert(
        novas.map((nome, i) => ({
          nome,
          cor: ETIQUETA_CORES[i % ETIQUETA_CORES.length],
          workspace_id: workspaceId,
        })),
        { onConflict: "workspace_id,nome", ignoreDuplicates: true }
      )
      .select("id, nome");

    for (const c of criadas || []) mapa.set(c.nome, c.id);

    const faltam = novas.filter((n) => !mapa.has(n));
    if (faltam.length > 0) {
      const { data: recheck } = await service
        .from("etiquetas")
        .select("id, nome")
        .eq("workspace_id", workspaceId)
        .in("nome", faltam);
      for (const r of recheck || []) mapa.set(r.nome, r.id);
    }
  }

  const vinculos = nomes
    .map((n) => mapa.get(n))
    .filter(Boolean)
    .map((etiquetaId) => ({ cartao_id: cartaoId, etiqueta_id: etiquetaId }));

  if (vinculos.length > 0) {
    await service.from("cartao_etiquetas").upsert(vinculos, {
      onConflict: "cartao_id,etiqueta_id",
      ignoreDuplicates: true,
    });
  }
}

// =============================================
// Helper interno: cria checklists em batch com seus itens
// =============================================
async function criarChecklists(
  service: ReturnType<typeof getService>,
  cartaoId: string,
  checklists: { titulo: string; itens: string[] }[]
) {
  const { data: cls } = await service
    .from("checklists")
    .insert(
      checklists.map((cl, ci) => ({
        cartao_id: cartaoId,
        titulo: cl.titulo || "Checklist",
        posicao: ci,
      }))
    )
    .select("id");

  if (cls && cls.length > 0) {
    const todosItens = checklists.flatMap((cl, ci) =>
      (cl.itens || []).map((texto: string, idx: number) => ({
        checklist_id: cls[ci].id,
        texto,
        concluido: false,
        posicao: idx,
      }))
    );
    if (todosItens.length > 0) {
      await service.from("checklist_itens").insert(todosItens);
    }
  }
}

// =============================================
// HANDLERS
// =============================================

export async function handleListCards(auth: ApiKeyAuth, request: Request) {
  const sp = getSearchParams(request);
  const service = getService();

  const limit = Math.min(parseInt(sp.get("limit") || "100", 10) || 100, 500);
  const offset = parseInt(sp.get("offset") || "0", 10) || 0;

  const status = sp.get("status");
  const sprintId = sp.get("sprint_id");

  if (status === "backlog") {
    const { data, count } = await service
      .from("cartoes")
      .select("*, cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)", {
        count: "exact",
      })
      .is("coluna_id", null)
      .eq("workspace_id", auth.workspaceId)
      .order("criado_em", { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      data: data || [],
      pagination: { offset, limit, total: count },
    });
  } else if (sprintId) {
    const { data: colunas } = await service
      .from("colunas")
      .select("id")
      .eq("quadro_id", sprintId);

    if (!colunas || colunas.length === 0)
      return NextResponse.json({
        data: [],
        pagination: { offset, limit, total: 0 },
      });

    const { data, count } = await service
      .from("cartoes")
      .select("*, cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)", {
        count: "exact",
      })
      .in(
        "coluna_id",
        colunas.map((c) => c.id)
      )
      .order("posicao")
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      data: data || [],
      pagination: { offset, limit, total: count },
    });
  } else {
    const { data, count } = await service
      .from("cartoes")
      .select("*, cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)", {
        count: "exact",
      })
      .eq("workspace_id", auth.workspaceId)
      .order("criado_em", { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      data: data || [],
      pagination: { offset, limit, total: count },
    });
  }
}

export async function handleGetCard(
  _auth: ApiKeyAuth,
  _req: Request,
  params: string[]
) {
  const [id] = params;
  const service = getService();

  const { data: card } = await service
    .from("cartoes")
    .select("*, cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)")
    .eq("id", id)
    .single();

  if (!card)
    return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });

  const { data: checklists } = await service
    .from("checklists")
    .select("*, checklist_itens(*)")
    .eq("cartao_id", id)
    .order("posicao");

  const etiquetaIds = (card.cartao_etiquetas || []).map(
    (e: { etiqueta_id: string }) => e.etiqueta_id
  );
  const { data: etiquetas } =
    etiquetaIds.length > 0
      ? await service.from("etiquetas").select("*").in("id", etiquetaIds)
      : { data: [] };

  return NextResponse.json({
    data: {
      ...card,
      checklists: checklists || [],
      etiquetas: etiquetas || [],
    },
  });
}

export async function handleCreateCard(auth: ApiKeyAuth, request: Request) {
  const body = await getBody(request);
  if (!body?.titulo) {
    return NextResponse.json({ error: "titulo obrigatorio" }, { status: 400 });
  }

  const service = getService();
  const { data, error } = await service
    .from("cartoes")
    .insert({
      titulo: body.titulo,
      descricao: body.descricao || null,
      peso: body.peso || null,
      workspace_id: auth.workspaceId,
      coluna_id: null,
      posicao: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data) {
    if (body.etiqueta_ids?.length > 0) {
      await service.from("cartao_etiquetas").insert(
        body.etiqueta_ids.map((eid: string) => ({
          cartao_id: data.id,
          etiqueta_id: eid,
        }))
      );
    }

    if (body.etiquetas?.length > 0) {
      await resolverEVincularEtiquetas(
        service,
        auth.workspaceId,
        data.id,
        body.etiquetas as string[]
      );
    }

    if (body.checklists?.length > 0) {
      await criarChecklists(service, data.id, body.checklists);
    }
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function handleUpdateCard(
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
  if (body.titulo !== undefined) campos.titulo = body.titulo;
  if (body.descricao !== undefined) campos.descricao = body.descricao;
  if (body.peso !== undefined) campos.peso = body.peso;
  if (body.data_entrega !== undefined) campos.data_entrega = body.data_entrega;
  campos.atualizado_em = new Date().toISOString();

  const { data, error } = await service
    .from("cartoes")
    .update(campos)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });

  if (body.etiquetas?.length > 0) {
    await resolverEVincularEtiquetas(
      service,
      auth.workspaceId,
      id,
      body.etiquetas as string[]
    );
  }

  if (body.checklists?.length > 0) {
    await criarChecklists(service, id, body.checklists);
  }

  return NextResponse.json({ data });
}

export async function handleDeleteCard(
  _auth: ApiKeyAuth,
  _req: Request,
  params: string[]
) {
  const [id] = params;
  const service = getService();

  const { error } = await service.from("cartoes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function handleToggleChecklistItem(
  _auth: ApiKeyAuth,
  request: Request,
  params: string[]
) {
  const [itemId] = params;
  const body = await getBody(request);
  const service = getService();

  if (body && typeof body.concluido === "boolean") {
    const { data, error } = await service
      .from("checklist_itens")
      .update({ concluido: body.concluido })
      .eq("id", itemId)
      .select()
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const { data: item } = await service
    .from("checklist_itens")
    .select("id, concluido")
    .eq("id", itemId)
    .single();

  if (!item)
    return NextResponse.json({ error: "Item nao encontrado" }, { status: 404 });

  const { data, error } = await service
    .from("checklist_itens")
    .update({ concluido: !item.concluido })
    .eq("id", itemId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function handleMoveCard(
  auth: ApiKeyAuth,
  request: Request,
  params: string[]
) {
  const [id] = params;
  const body = await getBody(request);
  if (!body)
    return NextResponse.json({ error: "Body obrigatorio" }, { status: 400 });

  const service = getService();

  if (body.backlog) {
    await service
      .from("cartoes")
      .update({
        coluna_id: null,
        workspace_id: auth.workspaceId,
        posicao: 0,
      })
      .eq("id", id);
  } else if (body.sprint_id) {
    const { data: colunas } = await service
      .from("colunas")
      .select("id")
      .eq("quadro_id", body.sprint_id)
      .order("posicao")
      .limit(1);

    if (!colunas || colunas.length === 0) {
      return NextResponse.json({ error: "Sprint sem colunas" }, { status: 400 });
    }

    await service
      .from("cartoes")
      .update({
        coluna_id: colunas[0].id,
        workspace_id: auth.workspaceId,
        posicao: 0,
      })
      .eq("id", id);
  } else if (body.coluna_id) {
    await service
      .from("cartoes")
      .update({
        coluna_id: body.coluna_id,
        workspace_id: auth.workspaceId,
        posicao: body.posicao ?? 0,
      })
      .eq("id", id);
  } else {
    return NextResponse.json(
      { error: "Informe backlog:true, sprint_id ou coluna_id" },
      { status: 400 }
    );
  }

  const { data } = await service
    .from("cartoes")
    .select("*")
    .eq("id", id)
    .single();
  return NextResponse.json({ data });
}
