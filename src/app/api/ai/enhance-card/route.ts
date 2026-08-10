import { createServerClient } from "@/lib/supabase/server";
import { exigirPro } from "@/lib/plano";
import { applyRateLimitAsync, validateBody, stripFormatting } from "@/lib/api-utils";
import { trackEvent } from "@/lib/umami";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obterLlm } from "@/lib/drivers/llm";
import { parseAIResponse } from "@/lib/ai-json-repair";

const schema = z.object({
  titulo: z.string().min(1).max(200),
  descricao: z.string().max(5000).optional().default(""),
  checklistItens: z.array(z.string()).optional().default([]),
  etiquetaIdsAtuais: z.array(z.string()).optional().default([]),
  etiquetasDisponiveis: z.array(z.object({
    id: z.string(),
    nome: z.string(),
  })).optional().default([]),
  peso: z.number().nullable().optional(),
  // Se informado, o endpoint busca membros + histórico do workspace pra
  // sugerir também o RESPONSÁVEL mais provável (baseado em cards parecidos).
  workspaceId: z.string().uuid().optional(),
  temResponsavel: z.boolean().optional().default(false),
});

interface ContextoResponsavel {
  membros: { id: string; nome: string }[];
  historico: string; // "titulo" [tags] → responsavel
}

function buildPrompt(data: z.infer<typeof schema>, ctx: ContextoResponsavel | null) {
  const temDescricao = data.descricao.trim().length > 0;
  const temChecklist = data.checklistItens.length > 0;
  const temEtiquetas = data.etiquetaIdsAtuais.length > 0;

  const etiquetasSection = data.etiquetasDisponiveis.length > 0
    ? `\nETIQUETAS (id exato): ${data.etiquetasDisponiveis.map((e) => `"${e.id}"=${e.nome}`).join(", ")}\nJa atribuidas: ${temEtiquetas ? data.etiquetaIdsAtuais.join(",") : "nenhuma"}`
    : "";

  const responsavelSection =
    ctx && ctx.membros.length > 0
      ? `\nMEMBROS (id exato): ${ctx.membros.map((m) => `"${m.id}"=${m.nome}`).join(", ")}
HISTORICO (cards concluidos → quem fez, pra inferir responsavel):
${ctx.historico || "(sem historico)"}`
      : "";

  const regraResponsavel =
    ctx && ctx.membros.length > 0
      ? `\n- responsavel_id: ${data.temResponsavel ? "null (ja tem responsavel)." : "id do membro que mais provavelmente deve pegar este card, inferido do historico. null se nao houver base clara."}
- responsavel_motivo: 1 frase curta (max 100 chars) justificando o responsavel. "" se responsavel_id for null.`
      : "";

  return `Melhore este card. Texto plano, sem markdown/emoji.

CARD:
titulo: ${data.titulo}
descricao: ${temDescricao ? data.descricao.slice(0, 400) : "(vazia)"}
peso: ${data.peso ?? "(nao definido)"}
checklist: ${temChecklist ? data.checklistItens.slice(0, 8).join(" | ") : "(vazio)"}${etiquetasSection}${responsavelSection}

REGRAS:
- descricao: ${temDescricao ? "Mantenha conteudo. Adicione user story 'Como X, quero Y para Z.' se faltar." : "Comece com user story 'Como X, quero Y para Z.' + 1 frase tecnica."} Max 400 chars.
- checklist_novos: 3-5 criterios novos curtos (<80 chars cada), nao repetir existentes.
- etiqueta_ids: lista COMPLETA de ids aplicaveis (incluindo existentes).
- peso_sugerido: fibonacci (1,2,3,5,8,13) se peso nao definido, senao null.${regraResponsavel}`;
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimitAsync(request, "ai-enhance", { maxRequests: 10 });
  if (limited) return limited;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  // IA e recurso do plano PRO (migration 057).
  const semPro = await exigirPro(supabase, user.id);
  if (semPro) return semPro;

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;

  // Analytics: registra uso de IA (enhance card)
  void trackEvent("ai_enhance_card", {
    user_id: user.id,
    tem_descricao: parsed.data.descricao.trim().length > 0,
    num_checklist: parsed.data.checklistItens.length,
  });

  const llm = obterLlm();
  if (!llm.ok) {
    return NextResponse.json({ error: llm.motivo }, { status: 503 });
  }

  // Contexto pra sugerir responsável (só se o workspaceId veio). RLS garante
  // que o usuário só lê membros/cards do próprio workspace.
  let ctxResp: ContextoResponsavel | null = null;
  if (parsed.data.workspaceId) {
    const wsId = parsed.data.workspaceId;
    const [membrosRes, histRes] = await Promise.all([
      supabase.from("membros").select("id, nome").eq("workspace_id", wsId),
      supabase
        .from("cartoes")
        .select(
          `titulo, cartao_etiquetas ( etiquetas ( nome ) ), cartao_membros ( membros ( nome ) )`
        )
        .eq("workspace_id", wsId)
        .not("data_conclusao", "is", null)
        .order("data_conclusao", { ascending: false })
        .limit(40),
    ]);
    type RawHist = {
      titulo: string;
      cartao_etiquetas: { etiquetas: { nome: string } | null }[] | null;
      cartao_membros: { membros: { nome: string } | null }[] | null;
    };
    const historico = ((histRes.data || []) as unknown as RawHist[])
      .map((c) => {
        const tags = (c.cartao_etiquetas || []).map((e) => e.etiquetas?.nome).filter(Boolean).join(",");
        const resp = (c.cartao_membros || []).map((m) => m.membros?.nome).filter(Boolean).join(",");
        return `"${c.titulo}" [${tags || "sem etiqueta"}] → ${resp || "sem responsavel"}`;
      })
      .join("\n");
    ctxResp = {
      membros: (membrosRes.data || []) as { id: string; nome: string }[],
      historico,
    };
  }

  try {
    const querResponsavel = !!ctxResp && ctxResp.membros.length > 0;
    const prompt = buildPrompt(parsed.data, ctxResp);
    const resposta = await llm.driver.gerarJson({
      prompt,
      temperatura: 0.3,
      maxTokens: 4000,
      esquema: {
        type: "object",
        properties: {
          descricao: { type: "string" },
          checklist_novos: {
            type: "array",
            maxItems: 5,
            items: { type: "string" },
          },
          etiqueta_ids: {
            type: "array",
            items: { type: "string" },
          },
          peso_sugerido: { type: "number", nullable: true },
          ...(querResponsavel
            ? {
                responsavel_id: { type: "string", nullable: true },
                responsavel_motivo: { type: "string" },
              }
            : {}),
        },
        required: ["descricao", "checklist_novos", "etiqueta_ids"],
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await parseAIResponse<Record<string, any>>(
      resposta.texto,
      "object",
      llm.driver,
    );
    if (!data) {
      console.error("[enhance-card] IA retornou formato invalido", {
        driver: llm.driver.nome,
        modelo: llm.driver.modelo,
        motivoParada: resposta.motivoParada,
        snippet: resposta.texto.slice(0, 500),
      });
      const motivo =
        resposta.motivoParada === "limite_tokens"
          ? "A resposta foi muito longa. Tente de novo."
          : resposta.motivoParada === "bloqueado"
            ? "A IA recusou processar esse conteudo."
            : "A IA retornou formato invalido. Tente novamente.";
      return NextResponse.json({ error: motivo }, { status: 502 });
    }

    // Validar etiqueta_ids
    const idsValidos = new Set(parsed.data.etiquetasDisponiveis.map((e) => e.id));
    const FIBONACCI = [1, 2, 3, 5, 8, 13];

    // Responsável: só ids de membros reais do workspace.
    const idsMembro = new Set((ctxResp?.membros || []).map((m) => m.id));
    const responsavel_id =
      querResponsavel && typeof data.responsavel_id === "string" && idsMembro.has(data.responsavel_id)
        ? data.responsavel_id
        : null;

    const sanitized = {
      descricao: stripFormatting(String(data.descricao || "")).slice(0, 5000),
      checklist_novos: Array.isArray(data.checklist_novos)
        ? data.checklist_novos.slice(0, 10).map((i: unknown) => stripFormatting(String(i || ""))).filter((s: string) => s.length > 0)
        : [],
      etiqueta_ids: Array.isArray(data.etiqueta_ids)
        ? data.etiqueta_ids.filter((id: unknown) => typeof id === "string" && idsValidos.has(id))
        : [],
      peso_sugerido: typeof data.peso_sugerido === "number" && FIBONACCI.includes(data.peso_sugerido)
        ? data.peso_sugerido
        : null,
      responsavel_id,
      responsavel_motivo:
        responsavel_id && typeof data.responsavel_motivo === "string"
          ? data.responsavel_motivo.slice(0, 140)
          : "",
    };

    return NextResponse.json(sanitized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    if (message.includes("API_KEY") || message.includes("403") || message.includes("401")) {
      return NextResponse.json({ error: "Chave da API do Gemini invalida." }, { status: 503 });
    }
    return NextResponse.json({ error: "Erro ao melhorar card com IA." }, { status: 500 });
  }
}
