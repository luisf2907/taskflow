import { NextResponse } from "next/server";
import { getService, type ApiKeyAuth } from "../_lib/helpers";

export async function handleListWorkspaces(auth: ApiKeyAuth) {
  const service = getService();
  const { data } = await service
    .from("workspaces")
    .select("*")
    .eq("id", auth.workspaceId);

  return NextResponse.json({ data: data || [] });
}

export async function handleGetWorkspace(
  auth: ApiKeyAuth,
  _req: Request,
  params: string[]
) {
  const [id] = params;
  if (id !== auth.workspaceId) {
    return NextResponse.json(
      { error: "Sem permissao neste workspace" },
      { status: 403 }
    );
  }

  const service = getService();
  const { data } = await service
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .single();

  if (!data)
    return NextResponse.json(
      { error: "Workspace nao encontrado" },
      { status: 404 }
    );
  return NextResponse.json({ data });
}
