import { NextResponse } from "next/server";
import {
  createPR,
  buscarBranchesAuth,
  buscarPRsAuth,
} from "@/lib/github/client";
import {
  getService,
  getBody,
  getGitHubToken,
  type ApiKeyAuth,
} from "../_lib/helpers";

export async function handleListRepos(auth: ApiKeyAuth) {
  const service = getService();
  const { data } = await service
    .from("repositorios")
    .select("*")
    .eq("workspace_id", auth.workspaceId);

  return NextResponse.json({ data: data || [] });
}

export async function handleListPRs(
  auth: ApiKeyAuth,
  _req: Request,
  params: string[]
) {
  const [owner, repo] = params;
  const service = getService();

  const token = await getGitHubToken(service, auth.userId);
  if (!token)
    return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  const result = await buscarPRsAuth(owner, repo, token);
  return NextResponse.json({ data: result.data || [] });
}

export async function handleListBranches(
  auth: ApiKeyAuth,
  _req: Request,
  params: string[]
) {
  const [owner, repo] = params;
  const service = getService();

  const token = await getGitHubToken(service, auth.userId);
  if (!token)
    return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  const result = await buscarBranchesAuth(owner, repo, token);
  return NextResponse.json({ data: result.data || [] });
}

export async function handleCreatePR(auth: ApiKeyAuth, request: Request) {
  const body = await getBody(request);
  if (!body?.repo || !body?.head || !body?.base || !body?.title) {
    return NextResponse.json(
      { error: "repo, head, base e title obrigatorios" },
      { status: 400 }
    );
  }

  const service = getService();
  const token = await getGitHubToken(service, auth.userId);
  if (!token)
    return NextResponse.json({ error: "GitHub nao conectado" }, { status: 403 });

  const [prOwner, prRepo] = body.repo.split("/");
  const result = await createPR(
    prOwner,
    prRepo,
    body.title,
    body.head,
    body.base,
    body.body || "",
    token
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Vincular ao card se fornecido
  if (body.card_id && result.data) {
    const pr = result.data as {
      number: number;
      html_url: string;
      user?: { login: string };
    };
    await service
      .from("cartoes")
      .update({
        pr_numero: pr.number,
        pr_url: pr.html_url,
        pr_status: "open",
        pr_autor: pr.user?.login || null,
      })
      .eq("id", body.card_id);
  }

  return NextResponse.json({ data: result.data }, { status: 201 });
}
