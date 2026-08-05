import { createServerClient } from "@/lib/supabase/server";
import { applyRateLimitAsync, validateBody } from "@/lib/api-utils";
import { trackEvent } from "@/lib/umami";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obterLlm, type FerramentaLlm } from "@/lib/drivers/llm";

const schema = z
  .object({
    // Aceita workspaceId direto (rota /workspace/[id]) OU quadroId
    // (rota /quadro/[id], onde [id] é o quadro/sprint — o workspace é
    // resolvido a partir dele).
    workspaceId: z.string().uuid().optional(),
    quadroId: z.string().uuid().optional(),
    pergunta: z.string().min(1).max(500),
    // Histórico opcional pra perguntas de follow-up (turnos anteriores)
    historico: z
      .array(z.object({ papel: z.enum(["user", "model"]), texto: z.string().max(4000) }))
      .max(10)
      .optional()
      .default([]),
  })
  .refine((d) => d.workspaceId || d.quadroId, {
    message: "Informe workspaceId ou quadroId",
  });

// Card "fonte" que a IA consultou — devolvido pra UI mostrar como citação.
interface CardFonte {
  id: string;
  titulo: string;
  quadro_id: string | null;
  coluna_nome: string | null;
}

// =============================================
// Tools expostas ao modelo (function calling)
// =============================================
// JSON Schema puro — o driver traduz para o formato do provedor.
const ferramentas: FerramentaLlm[] = [
  {
    nome: "consultar_cards",
    descricao:
      "Busca cards (tarefas) do workspace com filtros. Use pra responder sobre o que está pendente, atrasado, quem está em quê, carga de trabalho, etc.",
    parametros: {
      type: "object",
      properties: {
        sprint: {
          type: "string",
          description:
            "Nome da sprint pra filtrar, ou 'ativa' pra a sprint em andamento, ou 'todas'. Default 'todas'.",
        },
        apenas_pendentes: {
          type: "boolean",
          description: "Se true, só cards não concluídos.",
        },
        apenas_atrasados: {
          type: "boolean",
          description: "Se true, só cards com prazo vencido e não concluídos.",
        },
        responsavel: {
          type: "string",
          description: "Nome (ou parte) do responsável pra filtrar.",
        },
        texto: {
          type: "string",
          description: "Texto pra buscar no título do card.",
        },
      },
    },
  },
  {
    nome: "consultar_sprints",
    descricao:
      "Lista as sprints do workspace com status (planejada/ativa/concluída) e datas. Use pra responder sobre prazos e andamento de sprints.",
    parametros: { type: "object", properties: {} },
  },
];

// =============================================
// Execução das tools (queries Supabase — RLS já restringe ao workspace
// do usuário autenticado)
// =============================================
type Supa = Awaited<ReturnType<typeof createServerClient>>;

interface RawCard {
  id: string;
  titulo: string;
  peso: number | null;
  data_entrega: string | null;
  data_conclusao: string | null;
  eh_epico: boolean;
  colunas: { nome: string; quadro_id: string; quadros: { nome: string; status_sprint: string } | null } | null;
  cartao_membros: { membros: { nome: string } | null }[] | null;
}

async function execConsultarCards(
  supabase: Supa,
  workspaceId: string,
  args: Record<string, unknown>,
  fontes: Map<string, CardFonte>
) {
  const { data } = await supabase
    .from("cartoes")
    .select(
      `id, titulo, peso, data_entrega, data_conclusao, eh_epico,
       colunas:coluna_id ( nome, quadro_id, quadros:quadro_id ( nome, status_sprint ) ),
       cartao_membros ( membros ( nome ) )`
    )
    .eq("workspace_id", workspaceId)
    .limit(300);

  const hoje = new Date().toISOString().slice(0, 10);
  const sprintArg = String(args.sprint || "todas").toLowerCase();
  const respArg = args.responsavel ? String(args.responsavel).toLowerCase() : null;
  const textoArg = args.texto ? String(args.texto).toLowerCase() : null;

  const cards = ((data || []) as unknown as RawCard[])
    .filter((c) => !c.eh_epico)
    .map((c) => {
      const membros = (c.cartao_membros || [])
        .map((m) => m.membros?.nome)
        .filter((n): n is string => !!n);
      const atrasado =
        !!c.data_entrega && !c.data_conclusao && c.data_entrega.slice(0, 10) < hoje;
      return {
        id: c.id,
        titulo: c.titulo,
        coluna: c.colunas?.nome ?? "Backlog",
        quadro_id: c.colunas?.quadro_id ?? null,
        sprint: c.colunas?.quadros?.nome ?? "Backlog",
        sprint_status: c.colunas?.quadros?.status_sprint ?? null,
        responsaveis: membros,
        peso: c.peso,
        data_entrega: c.data_entrega ? c.data_entrega.slice(0, 10) : null,
        concluido: !!c.data_conclusao,
        atrasado,
      };
    })
    .filter((c) => {
      if (args.apenas_pendentes && c.concluido) return false;
      if (args.apenas_atrasados && !c.atrasado) return false;
      if (sprintArg === "ativa" && c.sprint_status !== "ativa") return false;
      if (sprintArg !== "todas" && sprintArg !== "ativa" && c.sprint.toLowerCase() !== sprintArg)
        return false;
      if (respArg && !c.responsaveis.some((r) => r.toLowerCase().includes(respArg)))
        return false;
      if (textoArg && !c.titulo.toLowerCase().includes(textoArg)) return false;
      return true;
    })
    .slice(0, 60);

  // Registra fontes (pra citação na UI)
  for (const c of cards) {
    if (!fontes.has(c.id)) {
      fontes.set(c.id, {
        id: c.id,
        titulo: c.titulo,
        quadro_id: c.quadro_id,
        coluna_nome: c.coluna,
      });
    }
  }

  // Payload enxuto pro modelo (sem ids longos no corpo)
  return {
    total: cards.length,
    cards: cards.map((c) => ({
      titulo: c.titulo,
      sprint: c.sprint,
      coluna: c.coluna,
      responsaveis: c.responsaveis,
      peso: c.peso,
      prazo: c.data_entrega,
      concluido: c.concluido,
      atrasado: c.atrasado,
    })),
  };
}

async function execConsultarSprints(supabase: Supa, workspaceId: string) {
  const { data } = await supabase
    .from("quadros")
    .select("nome, status_sprint, data_inicio, data_fim")
    .eq("workspace_id", workspaceId)
    .order("data_inicio", { ascending: false })
    .limit(40);

  return {
    sprints: (data || []).map((q) => ({
      nome: q.nome,
      status: q.status_sprint,
      inicio: q.data_inicio,
      fim: q.data_fim,
    })),
  };
}

// =============================================
// POST /api/ai/ask
// =============================================
export async function POST(request: NextRequest) {
  const limited = await applyRateLimitAsync(request, "ai-ask", { maxRequests: 20 });
  if (limited) return limited;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { pergunta, historico } = parsed.data;

  // Resolve o workspace: direto ou via quadro (rota /quadro/[id]).
  let workspaceId = parsed.data.workspaceId;
  if (!workspaceId && parsed.data.quadroId) {
    const { data: quadro } = await supabase
      .from("quadros")
      .select("workspace_id")
      .eq("id", parsed.data.quadroId)
      .single();
    workspaceId = quadro?.workspace_id ?? undefined;
  }
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace nao encontrado" }, { status: 404 });
  }

  // Garante que o usuário é membro do workspace (RLS-friendly: a query só
  // retorna se ele tiver acesso).
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, nome")
    .eq("id", workspaceId)
    .single();
  if (!ws) {
    return NextResponse.json({ error: "Workspace nao encontrado" }, { status: 404 });
  }

  const llm = obterLlm();
  if (!llm.ok) {
    return NextResponse.json({ error: llm.motivo }, { status: 503 });
  }

  void trackEvent("ai_ask", { user_id: user.id });

  const hoje = new Date().toISOString().slice(0, 10);
  const systemInstruction = `Você é o assistente do TaskFlow, respondendo perguntas sobre o workspace "${ws.nome}".
Hoje é ${hoje}.
Use as ferramentas pra buscar dados reais antes de responder — nunca invente cards ou números.
Responda em português, direto e conciso. Quando listar cards, use o título exato.
Se não houver dados pra responder, diga isso honestamente.`;

  const fontes = new Map<string, CardFonte>();

  try {
    // O laco de function calling vive no driver — Gemini e OpenAI-compat
    // expressam isso de formas incompativeis. Aqui so entregamos como
    // executar cada ferramenta.
    const resposta = await llm.driver.conversarComFerramentas({
      systemInstruction,
      historico: historico.map((h) => ({
        // O Gemini chama de "model" o que o padrao OpenAI chama de
        // "assistant". O contrato da rota (visivel pro client) segue o
        // nome do Gemini; a traducao acontece aqui.
        papel: h.papel === "model" ? ("assistant" as const) : ("user" as const),
        texto: h.texto,
      })),
      pergunta,
      ferramentas,
      executar: async (nome, argumentos) => {
        if (nome === "consultar_cards") {
          return execConsultarCards(supabase, workspaceId, argumentos, fontes);
        }
        if (nome === "consultar_sprints") {
          return execConsultarSprints(supabase, workspaceId);
        }
        return { erro: "ferramenta desconhecida" };
      },
    });

    return NextResponse.json({
      resposta: resposta || "Não consegui gerar uma resposta. Tente reformular.",
      fontes: [...fontes.values()].slice(0, 12),
    });
  } catch (err) {
    console.error("[ai/ask] erro", {
      driver: llm.driver.nome,
      modelo: llm.driver.modelo,
      err,
    });
    return NextResponse.json(
      { error: "Erro ao consultar a IA. Tente novamente." },
      { status: 502 }
    );
  }
}
