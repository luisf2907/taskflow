import { createServerClient } from "@/lib/supabase/server";
import { applyRateLimitAsync } from "@/lib/api-utils";
import { MENSAGEM_MAX, MENSAGEM_MIN, TIPOS_FEEDBACK, type TipoFeedback } from "@/lib/feedback";
import { NextRequest, NextResponse } from "next/server";

// POST — registrar feedback do usuario logado.
//
// Passa por rota em vez de ir direto ao PostgREST pelo client por dois
// motivos: o rate limit (feedback e o tipo de formulario que alguem segura o
// Enter em cima) e a normalizacao do `pagina`, que so o servidor consegue
// conferir contra o Referer se o client mentir.
export async function POST(request: NextRequest) {
  const limited = await applyRateLimitAsync(request, "feedback-create", {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: { tipo?: string; mensagem?: string; pagina?: string; workspace_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalido" }, { status: 400 });
  }

  const mensagem = (body.mensagem ?? "").trim();
  if (mensagem.length < MENSAGEM_MIN) {
    return NextResponse.json({ error: "Escreva um pouco mais" }, { status: 400 });
  }
  if (mensagem.length > MENSAGEM_MAX) {
    return NextResponse.json(
      { error: `Mensagem passa de ${MENSAGEM_MAX} caracteres` },
      { status: 400 }
    );
  }

  const tipo: TipoFeedback = TIPOS_FEEDBACK.includes(body.tipo as TipoFeedback)
    ? (body.tipo as TipoFeedback)
    : "sugestao";

  // Guarda so o caminho. A URL completa traria query string, e query string
  // em tela de card carrega id de recurso — dado que nao preciso pra ler um
  // feedback e que eu teria que passar a proteger.
  let pagina: string | null = null;
  if (typeof body.pagina === "string" && body.pagina.startsWith("/")) {
    pagina = body.pagina.split("?")[0].slice(0, 200);
  }

  // Se veio workspace_id, confere que o usuario e membro — senao o campo
  // viraria um jeito de sondar quais workspaces existem.
  let workspaceId: string | null = null;
  if (body.workspace_id) {
    const { count } = await supabase
      .from("workspace_usuarios")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", body.workspace_id)
      .eq("user_id", user.id);
    if (count && count > 0) workspaceId = body.workspace_id;
  }

  const { error } = await supabase.from("feedbacks").insert({
    usuario_id: user.id,
    workspace_id: workspaceId,
    tipo,
    mensagem,
    pagina,
  });

  if (error) {
    return NextResponse.json({ error: "Nao consegui salvar seu feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
