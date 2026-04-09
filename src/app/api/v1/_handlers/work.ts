import { NextResponse } from "next/server";
import { githubAuthFetch, createPR } from "@/lib/github/client";
import {
  getService,
  getBody,
  getGitHubToken,
  assertCard,
  isErrorResponse,
  type ApiKeyAuth,
} from "../_lib/helpers";

export async function handleStartWork(
  auth: ApiKeyAuth,
  request: Request,
  params: string[]
) {
  const [cardId] = params;
  const body = await getBody(request);
  const service = getService();

  // Buscar card (scoped ao workspace) + token em paralelo
  const [cardResult, token] = await Promise.all([
    assertCard(service, cardId, auth.workspaceId, "id, titulo, coluna_id, branch"),
    getGitHubToken(service, auth.userId),
  ]);

  if (isErrorResponse(cardResult)) return cardResult;
  const card = cardResult;
  if (!token)
    return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  const repo = body?.repo;
  const baseBranch = body?.base || "main";
  const updateFields: Record<string, unknown> = {};

  if (repo) {
    const branchName = `feat/${cardId.slice(0, 8)}-${card.titulo
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30)}`;

    const refResult = await githubAuthFetch<{ object: { sha: string } }>(
      `/repos/${repo}/git/ref/heads/${baseBranch}`,
      token
    );

    if (refResult.data) {
      await githubAuthFetch(`/repos/${repo}/git/refs`, token, {
        method: "POST",
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: refResult.data.object.sha,
        }),
      });
      updateFields.branch = branchName;
    }
  }

  // Mover card para "Em Progresso" (segunda coluna da sprint, se tiver)
  if (card.coluna_id) {
    const { data: colunas } = await service
      .from("colunas")
      .select("id")
      .eq(
        "quadro_id",
        (
          await service
            .from("colunas")
            .select("quadro_id")
            .eq("id", card.coluna_id)
            .single()
        ).data?.quadro_id || ""
      )
      .order("posicao")
      .limit(3);

    if (colunas && colunas.length >= 2) {
      updateFields.coluna_id = colunas[1].id;
    }
  }

  // 1 update com todos os campos, retornando o resultado (elimina re-fetch)
  if (Object.keys(updateFields).length > 0) {
    const { data: updated } = await service
      .from("cartoes")
      .update(updateFields)
      .eq("id", cardId)
      .eq("workspace_id", auth.workspaceId)
      .select()
      .single();
    return NextResponse.json({ data: updated, message: "Trabalho iniciado" });
  }

  return NextResponse.json({ data: card, message: "Trabalho iniciado" });
}

export async function handleFinishWork(
  auth: ApiKeyAuth,
  request: Request,
  params: string[]
) {
  const [cardId] = params;
  const body = await getBody(request);
  const service = getService();

  // Buscar card (scoped ao workspace) + token em paralelo
  const [cardResult, token] = await Promise.all([
    assertCard(
      service,
      cardId,
      auth.workspaceId,
      "id, titulo, descricao, coluna_id, branch, pr_repo_id"
    ),
    getGitHubToken(service, auth.userId),
  ]);

  if (isErrorResponse(cardResult)) return cardResult;
  const card = cardResult;
  if (!token)
    return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  const repo = body?.repo;
  const head = card.branch || body?.head;
  const base = body?.base || "main";

  if (!repo || !head) {
    return NextResponse.json(
      { error: "repo e head (branch) obrigatorios" },
      { status: 400 }
    );
  }

  const [prOwner, prRepo] = repo.split("/");
  const prResult = await createPR(
    prOwner,
    prRepo,
    card.titulo,
    head,
    base,
    card.descricao || `Card: ${card.titulo}`,
    token
  );

  if (prResult.error) {
    return NextResponse.json(
      { error: `Erro ao criar PR: ${prResult.error}` },
      { status: 500 }
    );
  }

  const updateFields: Record<string, unknown> = {};

  // Salvar PR no card (incluindo pr_repo_id)
  if (prResult.data) {
    const pr = prResult.data as {
      number: number;
      html_url: string;
      user?: { login: string };
    };

    const { data: repoData } = await service
      .from("repositorios")
      .select("id")
      .eq("owner", prOwner)
      .eq("nome", prRepo)
      .eq("workspace_id", auth.workspaceId)
      .maybeSingle();

    updateFields.pr_numero = pr.number;
    updateFields.pr_url = pr.html_url;
    updateFields.pr_status = "open";
    updateFields.pr_autor = pr.user?.login || null;
    updateFields.pr_repo_id = repoData?.id || card.pr_repo_id || null;
  }

  // Mover para "Em Review" (penultima coluna)
  if (card.coluna_id) {
    const { data: coluna } = await service
      .from("colunas")
      .select("quadro_id")
      .eq("id", card.coluna_id)
      .single();
    if (coluna) {
      const { data: colunas } = await service
        .from("colunas")
        .select("id")
        .eq("quadro_id", coluna.quadro_id)
        .order("posicao");

      if (colunas && colunas.length >= 3) {
        updateFields.coluna_id = colunas[colunas.length - 2].id;
      }
    }
  }

  // 1 update com todos os campos, retornando o resultado (elimina re-fetch)
  const { data: updated } = await service
    .from("cartoes")
    .update(updateFields)
    .eq("id", cardId)
    .eq("workspace_id", auth.workspaceId)
    .select()
    .single();

  return NextResponse.json({
    data: updated,
    message: "PR criado e card movido para Review",
  });
}
