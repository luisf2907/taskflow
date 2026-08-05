import { createServerClient } from "@/lib/supabase/server";
import { applyRateLimitAsync, validateBody, stripFormatting } from "@/lib/api-utils";
import { trackEvent } from "@/lib/umami";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obterLlm } from "@/lib/drivers/llm";
import { parseAIResponse } from "@/lib/ai-json-repair";

const schema = z.object({
  texto: z.string().min(3, "Texto muito curto").max(2000, "Texto muito longo (max 2000 caracteres)"),
  workspaceId: z.string().uuid("Workspace ID invalido"),
  etiquetas: z.array(z.object({
    id: z.string(),
    nome: z.string(),
    cor: z.string(),
  })).optional(),
});

function buildPrompt(etiquetas?: Array<{ id: string; nome: string; cor: string }>) {
  const etiquetasSection = etiquetas && etiquetas.length > 0
    ? `\nETIQUETAS (use id exato):\n${etiquetas.map((e) => `"${e.id}"=${e.nome}`).join(", ")}`
    : "";

  // Prompt enxuto pra evitar verbosidade que estoura tokens.
  // Regras de tamanho sao explicitas (chars) pra limitar output.
  return `Voce quebra requisitos em cards de tarefa. Texto plano, sem markdown/emoji.

Cards (min 1, max 5):
- titulo: imperativo curto (<60 chars). Nao use formato user story.
- descricao: "Como [persona], quero [acao] para [beneficio]." + 1 frase tecnica. Max 250 chars.
- peso: fibonacci (1,2,3,5,8,13).
- checklist: 3-5 criterios acionaveis curtos (<80 chars cada).
- etiqueta_ids: array de ids aplicaveis, ou vazio.${etiquetasSection}`;
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 per minute
  const limited = await applyRateLimitAsync(request, "ai-generate", { maxRequests: 5 });
  if (limited) return limited;

  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  // Validation
  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { texto, etiquetas } = parsed.data;

  // Analytics: registra uso de IA (gera cards)
  void trackEvent("ai_generate_cards", {
    user_id: user.id,
    texto_len: texto.length,
    num_etiquetas: etiquetas?.length ?? 0,
  });

  const llm = obterLlm();
  if (!llm.ok) {
    return NextResponse.json({ error: llm.motivo }, { status: 503 });
  }

  try {
    const prompt = buildPrompt(etiquetas);
    const resposta = await llm.driver.gerarJson({
      prompt: `${prompt}\n\nRequisito:\n${texto}`,
      temperatura: 0.3,
      maxTokens: 8000,
      // O esquema garante estrutura fixa — elimina os casos em que o
      // modelo devolvia markdown, texto extra ou JSON malformado.
      // maxItems: 5 limita o tamanho total do output.
      esquema: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            descricao: { type: "string" },
            peso: { type: "number" },
            checklist: {
              type: "array",
              maxItems: 5,
              items: { type: "string" },
            },
            etiqueta_ids: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["titulo", "descricao", "peso", "checklist", "etiqueta_ids"],
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cards = await parseAIResponse<Array<Record<string, any>>>(
      resposta.texto,
      "array",
      llm.driver,
    );
    if (!cards) {
      console.error("[generate-cards] IA retornou formato invalido", {
        driver: llm.driver.nome,
        modelo: llm.driver.modelo,
        motivoParada: resposta.motivoParada,
        snippet: resposta.texto.slice(0, 500),
      });
      const motivo =
        resposta.motivoParada === "limite_tokens"
          ? "A resposta foi muito longa. Tente descrever em menos detalhes."
          : resposta.motivoParada === "bloqueado"
            ? "A IA recusou processar esse conteudo. Tente reformular."
            : "A IA retornou um formato invalido. Tente novamente.";
      return NextResponse.json({ error: motivo }, { status: 502 });
    }

    // Validate structure
    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json(
        { error: "A IA nao conseguiu gerar cards. Tente descrever melhor o que precisa." },
        { status: 422 }
      );
    }

    // IDs validos de etiquetas
    const etiquetaIdsValidos = new Set((etiquetas || []).map((e) => e.id));

    // Sanitize and validate each card
    const FIBONACCI = [1, 2, 3, 5, 8, 13];
    const sanitized = cards.slice(0, 10).map((card) => ({
      titulo: stripFormatting(String(card.titulo || "")).slice(0, 200),
      descricao: stripFormatting(String(card.descricao || "")).slice(0, 2000),
      peso: FIBONACCI.includes(card.peso) ? card.peso : 3,
      checklist: Array.isArray(card.checklist)
        ? card.checklist.slice(0, 10).map((item: unknown) => stripFormatting(String(item || ""))).filter((s: string) => s.length > 0)
        : [],
      etiqueta_ids: Array.isArray(card.etiqueta_ids)
        ? card.etiqueta_ids.filter((id: unknown) => typeof id === "string" && etiquetaIdsValidos.has(id))
        : [],
    })).filter((c) => c.titulo.length > 0);

    return NextResponse.json({ cards: sanitized });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";

    if (message.includes("API_KEY") || message.includes("403") || message.includes("401")) {
      return NextResponse.json(
        { error: "Chave da API do Gemini invalida ou sem permissao." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao gerar cards com IA. Tente novamente." },
      { status: 500 }
    );
  }
}
