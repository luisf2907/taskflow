import { authenticateApiKey, type ApiKeyAuth } from "@/lib/mcp-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { applyRateLimit } from "@/lib/api-utils";
import {
  githubAuthFetch,
  createPR,
  buscarBranchesAuth,
  buscarPRsAuth,
} from "@/lib/github/client";
import { NextRequest, NextResponse } from "next/server";

// =============================================
// ROUTER
// =============================================

type Handler = (
  auth: ApiKeyAuth,
  request: Request,
  params: string[]
) => Promise<NextResponse>;

function matchRoute(
  method: string,
  segments: string[],
  routes: Array<{ method: string; pattern: string[]; handler: Handler }>
): { handler: Handler; params: string[] } | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.pattern.length !== segments.length) continue;

    const params: string[] = [];
    let match = true;
    for (let i = 0; i < route.pattern.length; i++) {
      if (route.pattern[i] === "*") {
        params.push(segments[i]);
      } else if (route.pattern[i] === "**") {
        params.push(segments.slice(i).join("/"));
        break;
      } else if (route.pattern[i] !== segments[i]) {
        match = false;
        break;
      }
    }
    if (match) return { handler: route.handler, params };
  }
  return null;
}

const routes: Array<{ method: string; pattern: string[]; handler: Handler }> = [
  // Workspaces
  { method: "GET", pattern: ["workspaces"], handler: handleListWorkspaces },
  { method: "GET", pattern: ["workspaces", "*"], handler: handleGetWorkspace },

  // Cards
  { method: "GET", pattern: ["cards"], handler: handleListCards },
  { method: "GET", pattern: ["cards", "*"], handler: handleGetCard },
  { method: "POST", pattern: ["cards"], handler: handleCreateCard },
  { method: "PATCH", pattern: ["cards", "*"], handler: handleUpdateCard },
  { method: "DELETE", pattern: ["cards", "*"], handler: handleDeleteCard },
  { method: "POST", pattern: ["cards", "*", "move"], handler: handleMoveCard },
  { method: "POST", pattern: ["cards", "*", "start-work"], handler: handleStartWork },
  { method: "POST", pattern: ["cards", "*", "finish-work"], handler: handleFinishWork },

  // Checklists
  { method: "PATCH", pattern: ["checklist-items", "*"], handler: handleToggleChecklistItem },

  // Sprints
  { method: "GET", pattern: ["sprints"], handler: handleListSprints },
  { method: "GET", pattern: ["sprints", "*", "summary"], handler: handleSprintSummary },
  { method: "GET", pattern: ["sprints", "*", "columns"], handler: handleSprintColumns },
  { method: "POST", pattern: ["sprints"], handler: handleCreateSprint },
  { method: "PATCH", pattern: ["sprints", "*"], handler: handleUpdateSprint },

  // GitHub
  { method: "GET", pattern: ["repos"], handler: handleListRepos },
  { method: "GET", pattern: ["repos", "*", "*", "prs"], handler: handleListPRs },
  { method: "GET", pattern: ["repos", "*", "*", "branches"], handler: handleListBranches },
  { method: "POST", pattern: ["prs"], handler: handleCreatePR },

  // IA
  { method: "POST", pattern: ["ai", "generate-cards"], handler: handleAIGenerateCards },
  { method: "POST", pattern: ["ai", "enhance-card"], handler: handleAIEnhanceCard },
];

// =============================================
// ENTRY POINTS
// =============================================

async function handleRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const limited = applyRateLimit(request, "api-v1", { maxRequests: 60, windowMs: 60_000 });
  if (limited) return limited;

  const authResult = await authenticateApiKey(request);
  if (authResult instanceof NextResponse) return authResult;

  const { path } = await params;
  const method = request.method;

  const matched = matchRoute(method, path, routes);
  if (!matched) {
    return NextResponse.json(
      { error: `Rota nao encontrada: ${method} /api/v1/${path.join("/")}` },
      { status: 404 }
    );
  }

  try {
    return await matched.handler(authResult, request, matched.params);
  } catch (err) {
    console.error(`[API v1] ${method} /${path.join("/")}:`, err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;

// =============================================
// HELPERS
// =============================================

function getService() {
  return createServiceClient();
}

async function getBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function getSearchParams(request: Request) {
  return new URL(request.url).searchParams;
}

async function getGitHubToken(service: ReturnType<typeof createServiceClient>, userId: string) {
  const { data } = await service
    .from("github_tokens")
    .select("provider_token")
    .eq("user_id", userId)
    .single();
  return data?.provider_token ?? null;
}

// =============================================
// WORKSPACES
// =============================================

async function handleListWorkspaces(auth: ApiKeyAuth) {
  const service = getService();
  const { data } = await service
    .from("workspaces")
    .select("*")
    .eq("id", auth.workspaceId);

  return NextResponse.json({ data: data || [] });
}

async function handleGetWorkspace(auth: ApiKeyAuth, _req: Request, params: string[]) {
  const [id] = params;
  if (id !== auth.workspaceId) {
    return NextResponse.json({ error: "Sem permissao neste workspace" }, { status: 403 });
  }

  const service = getService();
  const { data } = await service
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) return NextResponse.json({ error: "Workspace nao encontrado" }, { status: 404 });
  return NextResponse.json({ data });
}

// =============================================
// CARDS
// =============================================

async function handleListCards(auth: ApiKeyAuth, request: Request) {
  const sp = getSearchParams(request);
  const service = getService();

  let query = service
    .from("cartoes")
    .select("*, cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)")
    .order("criado_em", { ascending: false })
    .limit(100);

  const status = sp.get("status");
  const sprintId = sp.get("sprint_id");

  if (status === "backlog") {
    query = query.is("coluna_id", null).eq("workspace_id", auth.workspaceId);
  } else if (sprintId) {
    // Cards de uma sprint especifica — buscar colunas da sprint primeiro
    const { data: colunas } = await service
      .from("colunas")
      .select("id")
      .eq("quadro_id", sprintId);

    if (!colunas || colunas.length === 0) return NextResponse.json({ data: [] });
    query = query.in("coluna_id", colunas.map(c => c.id));
  } else {
    // Todos os cards do workspace (backlog + sprints)
    const { data: quadros } = await service
      .from("quadros")
      .select("id")
      .eq("workspace_id", auth.workspaceId);

    const qIds = (quadros || []).map(q => q.id);

    const { data: colunas } = qIds.length > 0
      ? await service.from("colunas").select("id").in("quadro_id", qIds)
      : { data: [] };

    const colIds = (colunas || []).map(c => c.id);

    // Backlog + sprint cards
    const [backlogRes, sprintRes] = await Promise.all([
      service
        .from("cartoes")
        .select("*, cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)")
        .is("coluna_id", null)
        .eq("workspace_id", auth.workspaceId)
        .order("criado_em", { ascending: false })
        .limit(100),
      colIds.length > 0
        ? service
            .from("cartoes")
            .select("*, cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)")
            .in("coluna_id", colIds)
            .order("posicao")
            .limit(200)
        : Promise.resolve({ data: [] }),
    ]);

    return NextResponse.json({
      data: [...(backlogRes.data || []), ...(sprintRes.data || [])],
    });
  }

  const { data } = await query;
  return NextResponse.json({ data: data || [] });
}

async function handleGetCard(auth: ApiKeyAuth, _req: Request, params: string[]) {
  const [id] = params;
  const service = getService();

  const { data: card } = await service
    .from("cartoes")
    .select("*, cartao_etiquetas(etiqueta_id), cartao_membros(membro_id)")
    .eq("id", id)
    .single();

  if (!card) return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });

  // Buscar checklists
  const { data: checklists } = await service
    .from("checklists")
    .select("*, checklist_itens(*)")
    .eq("cartao_id", id)
    .order("posicao");

  // Buscar etiquetas completas
  const etiquetaIds = (card.cartao_etiquetas || []).map((e: { etiqueta_id: string }) => e.etiqueta_id);
  const { data: etiquetas } = etiquetaIds.length > 0
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

async function handleCreateCard(auth: ApiKeyAuth, request: Request) {
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
    // Associar etiquetas se fornecidas
    if (body.etiqueta_ids?.length > 0) {
      await service.from("cartao_etiquetas").insert(
        body.etiqueta_ids.map((eid: string) => ({ cartao_id: data.id, etiqueta_id: eid }))
      );
    }

    // Criar etiquetas por nome (se nao existem, cria no workspace)
    if (body.etiquetas?.length > 0) {
      const cores = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#6366F1", "#A855F7", "#EC4899"];
      for (let i = 0; i < body.etiquetas.length; i++) {
        const nome = body.etiquetas[i] as string;
        // Buscar existente
        const { data: existente } = await service
          .from("etiquetas")
          .select("id")
          .eq("workspace_id", auth.workspaceId)
          .eq("nome", nome)
          .limit(1)
          .maybeSingle();

        let etiquetaId = existente?.id;

        // Criar se nao existe
        if (!etiquetaId) {
          const { data: nova } = await service
            .from("etiquetas")
            .insert({ nome, cor: cores[i % cores.length], workspace_id: auth.workspaceId })
            .select("id")
            .single();
          etiquetaId = nova?.id;
        }

        if (etiquetaId) {
          await service.from("cartao_etiquetas").insert({ cartao_id: data.id, etiqueta_id: etiquetaId });
        }
      }
    }

    // Criar checklists
    if (body.checklists?.length > 0) {
      for (let ci = 0; ci < body.checklists.length; ci++) {
        const checklist = body.checklists[ci] as { titulo: string; itens: string[] };
        const titulo = checklist.titulo || "Checklist";
        const itens = checklist.itens || [];

        const { data: cl } = await service
          .from("checklists")
          .insert({ cartao_id: data.id, titulo, posicao: ci })
          .select("id")
          .single();

        if (cl && itens.length > 0) {
          await service.from("checklist_itens").insert(
            itens.map((texto: string, idx: number) => ({
              checklist_id: cl.id,
              texto,
              concluido: false,
              posicao: idx,
            }))
          );
        }
      }
    }
  }

  return NextResponse.json({ data }, { status: 201 });
}

async function handleUpdateCard(auth: ApiKeyAuth, request: Request, params: string[]) {
  const [id] = params;
  const body = await getBody(request);
  if (!body) return NextResponse.json({ error: "Body obrigatorio" }, { status: 400 });

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
  if (!data) return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });

  // Adicionar etiquetas por nome
  if (body.etiquetas?.length > 0) {
    const cores = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#3B82F6", "#6366F1", "#A855F7", "#EC4899"];
    for (let i = 0; i < body.etiquetas.length; i++) {
      const nome = body.etiquetas[i] as string;
      const { data: existente } = await service
        .from("etiquetas")
        .select("id")
        .eq("workspace_id", auth.workspaceId)
        .eq("nome", nome)
        .limit(1)
        .maybeSingle();

      let etiquetaId = existente?.id;
      if (!etiquetaId) {
        const { data: nova } = await service
          .from("etiquetas")
          .insert({ nome, cor: cores[i % cores.length], workspace_id: auth.workspaceId })
          .select("id")
          .single();
        etiquetaId = nova?.id;
      }

      if (etiquetaId) {
        await service.from("cartao_etiquetas").upsert(
          { cartao_id: id, etiqueta_id: etiquetaId },
          { onConflict: "cartao_id,etiqueta_id", ignoreDuplicates: true }
        );
      }
    }
  }

  // Adicionar checklists
  if (body.checklists?.length > 0) {
    for (let ci = 0; ci < body.checklists.length; ci++) {
      const checklist = body.checklists[ci] as { titulo: string; itens: string[] };
      const { data: cl } = await service
        .from("checklists")
        .insert({ cartao_id: id, titulo: checklist.titulo || "Checklist", posicao: ci })
        .select("id")
        .single();

      if (cl && checklist.itens?.length > 0) {
        await service.from("checklist_itens").insert(
          checklist.itens.map((texto: string, idx: number) => ({
            checklist_id: cl.id, texto, concluido: false, posicao: idx,
          }))
        );
      }
    }
  }

  return NextResponse.json({ data });
}

async function handleDeleteCard(_auth: ApiKeyAuth, _req: Request, params: string[]) {
  const [id] = params;
  const service = getService();

  const { error } = await service.from("cartoes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

async function handleToggleChecklistItem(_auth: ApiKeyAuth, request: Request, params: string[]) {
  const [itemId] = params;
  const body = await getBody(request);
  const service = getService();

  // Se body tem "concluido", usar esse valor. Senao, fazer toggle.
  if (body && typeof body.concluido === "boolean") {
    const { data, error } = await service
      .from("checklist_itens")
      .update({ concluido: body.concluido })
      .eq("id", itemId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // Toggle: buscar estado atual e inverter
  const { data: item } = await service
    .from("checklist_itens")
    .select("id, concluido")
    .eq("id", itemId)
    .single();

  if (!item) return NextResponse.json({ error: "Item nao encontrado" }, { status: 404 });

  const { data, error } = await service
    .from("checklist_itens")
    .update({ concluido: !item.concluido })
    .eq("id", itemId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

async function handleMoveCard(auth: ApiKeyAuth, request: Request, params: string[]) {
  const [id] = params;
  const body = await getBody(request);
  if (!body) return NextResponse.json({ error: "Body obrigatorio" }, { status: 400 });

  const service = getService();

  if (body.backlog) {
    // Mover para backlog
    await service.from("cartoes").update({
      coluna_id: null,
      workspace_id: auth.workspaceId,
      posicao: 0,
    }).eq("id", id);
  } else if (body.sprint_id) {
    // Mover para primeira coluna da sprint
    const { data: colunas } = await service
      .from("colunas")
      .select("id")
      .eq("quadro_id", body.sprint_id)
      .order("posicao")
      .limit(1);

    if (!colunas || colunas.length === 0) {
      return NextResponse.json({ error: "Sprint sem colunas" }, { status: 400 });
    }

    await service.from("cartoes").update({
      coluna_id: colunas[0].id,
      workspace_id: null,
      posicao: 0,
    }).eq("id", id);
  } else if (body.coluna_id) {
    // Mover para coluna especifica
    await service.from("cartoes").update({
      coluna_id: body.coluna_id,
      workspace_id: null,
      posicao: body.posicao ?? 0,
    }).eq("id", id);
  } else {
    return NextResponse.json({ error: "Informe backlog:true, sprint_id ou coluna_id" }, { status: 400 });
  }

  const { data } = await service.from("cartoes").select("*").eq("id", id).single();
  return NextResponse.json({ data });
}

// =============================================
// START/FINISH WORK (fluxo integrado)
// =============================================

async function handleStartWork(auth: ApiKeyAuth, request: Request, params: string[]) {
  const [cardId] = params;
  const body = await getBody(request);
  const service = getService();

  // Buscar card
  const { data: card } = await service.from("cartoes").select("*").eq("id", cardId).single();
  if (!card) return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });

  // Buscar token GitHub
  const token = await getGitHubToken(service, auth.userId);
  if (!token) return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  // Criar branch (se repo fornecido)
  const repo = body?.repo;
  const baseBranch = body?.base || "main";

  if (repo) {
    const branchName = `feat/${cardId.slice(0, 8)}-${card.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`;

    // Buscar SHA da base
    const refResult = await githubAuthFetch<{ object: { sha: string } }>(
      `/repos/${repo}/git/ref/heads/${baseBranch}`,
      token
    );

    if (refResult.data) {
      await githubAuthFetch(
        `/repos/${repo}/git/refs`,
        token,
        { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: refResult.data.object.sha }) }
      );

      // Salvar branch no card
      await service.from("cartoes").update({ branch: branchName }).eq("id", cardId);
    }
  }

  // Mover card para "Em Progresso" (segunda coluna da sprint, se tiver)
  if (card.coluna_id) {
    const { data: coluna } = await service.from("colunas").select("quadro_id").eq("id", card.coluna_id).single();
    if (coluna) {
      const { data: colunas } = await service
        .from("colunas")
        .select("id")
        .eq("quadro_id", coluna.quadro_id)
        .order("posicao")
        .limit(3);

      // Segunda coluna = "Em Progresso"
      if (colunas && colunas.length >= 2) {
        await service.from("cartoes").update({ coluna_id: colunas[1].id }).eq("id", cardId);
      }
    }
  }

  const { data: updated } = await service.from("cartoes").select("*").eq("id", cardId).single();
  return NextResponse.json({ data: updated, message: "Trabalho iniciado" });
}

async function handleFinishWork(auth: ApiKeyAuth, request: Request, params: string[]) {
  const [cardId] = params;
  const body = await getBody(request);
  const service = getService();

  const { data: card } = await service.from("cartoes").select("*").eq("id", cardId).single();
  if (!card) return NextResponse.json({ error: "Card nao encontrado" }, { status: 404 });

  const token = await getGitHubToken(service, auth.userId);
  if (!token) return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  const repo = body?.repo;
  const head = card.branch || body?.head;
  const base = body?.base || "main";

  if (!repo || !head) {
    return NextResponse.json({ error: "repo e head (branch) obrigatorios" }, { status: 400 });
  }

  // Criar PR
  const [prOwner, prRepo] = repo.split("/");
  const prResult = await createPR(
    prOwner, prRepo, card.titulo, head, base,
    card.descricao || `Card: ${card.titulo}`, token
  );

  if (prResult.error) {
    return NextResponse.json({ error: `Erro ao criar PR: ${prResult.error}` }, { status: 500 });
  }

  // Salvar PR no card
  if (prResult.data) {
    const pr = prResult.data as { number: number; html_url: string; user?: { login: string } };
    await service.from("cartoes").update({
      pr_numero: pr.number,
      pr_url: pr.html_url,
      pr_status: "open",
      pr_autor: pr.user?.login || null,
    }).eq("id", cardId);
  }

  // Mover para "Em Review" (penultima coluna)
  if (card.coluna_id) {
    const { data: coluna } = await service.from("colunas").select("quadro_id").eq("id", card.coluna_id).single();
    if (coluna) {
      const { data: colunas } = await service
        .from("colunas")
        .select("id")
        .eq("quadro_id", coluna.quadro_id)
        .order("posicao");

      // Penultima coluna = "Em Review"
      if (colunas && colunas.length >= 3) {
        const reviewCol = colunas[colunas.length - 2];
        await service.from("cartoes").update({ coluna_id: reviewCol.id }).eq("id", cardId);
      }
    }
  }

  const { data: updated } = await service.from("cartoes").select("*").eq("id", cardId).single();
  return NextResponse.json({ data: updated, message: "PR criado e card movido para Review" });
}

// =============================================
// SPRINTS
// =============================================

async function handleListSprints(auth: ApiKeyAuth) {
  const service = getService();
  const { data } = await service
    .from("quadros")
    .select("*")
    .eq("workspace_id", auth.workspaceId)
    .order("criado_em", { ascending: false });

  return NextResponse.json({ data: data || [] });
}

async function handleSprintSummary(_auth: ApiKeyAuth, _req: Request, params: string[]) {
  const [sprintId] = params;
  const service = getService();

  const { data: sprint } = await service.from("quadros").select("*").eq("id", sprintId).single();
  if (!sprint) return NextResponse.json({ error: "Sprint nao encontrada" }, { status: 404 });

  const { data: colunas } = await service
    .from("colunas")
    .select("id, nome, posicao")
    .eq("quadro_id", sprintId)
    .order("posicao");

  if (!colunas || colunas.length === 0) {
    return NextResponse.json({ data: { sprint, colunas: [], total_cards: 0, total_pontos: 0 } });
  }

  const colIds = colunas.map(c => c.id);
  const { data: cards } = await service
    .from("cartoes")
    .select("id, titulo, peso, coluna_id")
    .in("coluna_id", colIds);

  const cardsList = cards || [];
  const ultimaColuna = colunas[colunas.length - 1].id;

  const colunasComCards = colunas.map(col => ({
    ...col,
    cards: cardsList.filter(c => c.coluna_id === col.id).length,
    pontos: cardsList.filter(c => c.coluna_id === col.id).reduce((s, c) => s + (c.peso || 0), 0),
  }));

  const concluidos = cardsList.filter(c => c.coluna_id === ultimaColuna);

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

async function handleSprintColumns(_auth: ApiKeyAuth, _req: Request, params: string[]) {
  const [sprintId] = params;
  const service = getService();

  const { data } = await service
    .from("colunas")
    .select("*")
    .eq("quadro_id", sprintId)
    .order("posicao");

  return NextResponse.json({ data: data || [] });
}

async function handleCreateSprint(auth: ApiKeyAuth, request: Request) {
  const body = await getBody(request);
  if (!body?.nome) return NextResponse.json({ error: "nome obrigatorio" }, { status: 400 });

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
  const { data: ws } = await service.from("workspaces").select("colunas_padrao").eq("id", auth.workspaceId).single();
  const colsPadrao = ws?.colunas_padrao || ["A fazer", "Em progresso", "Concluido"];

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

async function handleUpdateSprint(_auth: ApiKeyAuth, request: Request, params: string[]) {
  const [id] = params;
  const body = await getBody(request);
  if (!body) return NextResponse.json({ error: "Body obrigatorio" }, { status: 400 });

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
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// =============================================
// GITHUB
// =============================================

async function handleListRepos(auth: ApiKeyAuth) {
  const service = getService();
  const { data } = await service
    .from("repositorios")
    .select("*")
    .eq("workspace_id", auth.workspaceId);

  return NextResponse.json({ data: data || [] });
}

async function handleListPRs(auth: ApiKeyAuth, _req: Request, params: string[]) {
  const [owner, repo] = params;
  const service = getService();

  const token = await getGitHubToken(service, auth.userId);
  if (!token) return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  const result = await buscarPRsAuth(owner, repo, token);
  return NextResponse.json({ data: result.data || [] });
}

async function handleListBranches(auth: ApiKeyAuth, _req: Request, params: string[]) {
  const [owner, repo] = params;
  const service = getService();

  const token = await getGitHubToken(service, auth.userId);
  if (!token) return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  const result = await buscarBranchesAuth(owner, repo, token);
  return NextResponse.json({ data: result.data || [] });
}

async function handleCreatePR(auth: ApiKeyAuth, request: Request) {
  const body = await getBody(request);
  if (!body?.repo || !body?.head || !body?.base || !body?.title) {
    return NextResponse.json({ error: "repo, head, base e title obrigatorios" }, { status: 400 });
  }

  const service = getService();
  const token = await getGitHubToken(service, auth.userId);
  if (!token) return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  const [prOwner, prRepo] = body.repo.split("/");
  const result = await createPR(
    prOwner, prRepo, body.title, body.head, body.base,
    body.body || "", token
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Vincular ao card se fornecido
  if (body.card_id && result.data) {
    const pr = result.data as { number: number; html_url: string; user?: { login: string } };
    await service.from("cartoes").update({
      pr_numero: pr.number,
      pr_url: pr.html_url,
      pr_status: "open",
      pr_autor: pr.user?.login || null,
    }).eq("id", body.card_id);
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}

// =============================================
// IA (proxy para routes existentes)
// =============================================

async function handleAIGenerateCards(auth: ApiKeyAuth, request: Request) {
  const body = await getBody(request);
  if (!body?.texto) return NextResponse.json({ error: "texto obrigatorio" }, { status: 400 });

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

async function handleAIEnhanceCard(auth: ApiKeyAuth, request: Request) {
  const body = await getBody(request);
  if (!body?.cardId) return NextResponse.json({ error: "cardId obrigatorio" }, { status: 400 });

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
