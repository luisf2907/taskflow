import { createServerClient } from "@/lib/supabase/server";
import { applyRateLimitAsync, validateBody, stripFormatting } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
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
});

function buildPrompt(data: z.infer<typeof schema>) {
  const temDescricao = data.descricao.trim().length > 0;
  const temChecklist = data.checklistItens.length > 0;
  const temEtiquetas = data.etiquetaIdsAtuais.length > 0;

  const etiquetasSection = data.etiquetasDisponiveis.length > 0
    ? `\nETIQUETAS (id exato): ${data.etiquetasDisponiveis.map((e) => `"${e.id}"=${e.nome}`).join(", ")}\nJa atribuidas: ${temEtiquetas ? data.etiquetaIdsAtuais.join(",") : "nenhuma"}`
    : "";

  return `Melhore este card. Texto plano, sem markdown/emoji.

CARD:
titulo: ${data.titulo}
descricao: ${temDescricao ? data.descricao.slice(0, 400) : "(vazia)"}
peso: ${data.peso ?? "(nao definido)"}
checklist: ${temChecklist ? data.checklistItens.slice(0, 8).join(" | ") : "(vazio)"}${etiquetasSection}

REGRAS:
- descricao: ${temDescricao ? "Mantenha conteudo. Adicione user story 'Como X, quero Y para Z.' se faltar." : "Comece com user story 'Como X, quero Y para Z.' + 1 frase tecnica."} Max 400 chars.
- checklist_novos: 3-5 criterios novos curtos (<80 chars cada), nao repetir existentes.
- etiqueta_ids: lista COMPLETA de ids aplicaveis (incluindo existentes).
- peso_sugerido: fibonacci (1,2,3,5,8,13) se peso nao definido, senao null.`;
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimitAsync(request, "ai-enhance", { maxRequests: 10 });
  if (limited) return limited;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "IA nao configurada. Adicione GEMINI_API_KEY nas variaveis de ambiente." },
      { status: 503 }
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = buildPrompt(parsed.data);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            descricao: { type: SchemaType.STRING },
            checklist_novos: {
              type: SchemaType.ARRAY,
              maxItems: 5,
              items: { type: SchemaType.STRING },
            },
            etiqueta_ids: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            peso_sugerido: { type: SchemaType.NUMBER, nullable: true },
          },
          required: ["descricao", "checklist_novos", "etiqueta_ids"],
        },
        // Thinking mode (Gemini 2.5/3.x) consome tokens silenciosamente.
        // thinkingBudget: 0 garante que o budget de 4k vai todo pro JSON.
        ...({ thinkingConfig: { thinkingBudget: 0 } } as object),
      },
    });

    const responseText = result.response.text();

    // Parse JSON (com fallback via Gemini Flash Lite)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await parseAIResponse<Record<string, any>>(responseText, "object", apiKey);
    if (!data) {
      const finishReason = result.response.candidates?.[0]?.finishReason;
      console.error("[enhance-card] IA retornou formato invalido", {
        finishReason,
        snippet: responseText.slice(0, 500),
      });
      const motivo =
        finishReason === "MAX_TOKENS"
          ? "A resposta foi muito longa. Tente de novo."
          : finishReason === "SAFETY"
            ? "A IA recusou processar esse conteudo."
            : "A IA retornou formato invalido. Tente novamente.";
      return NextResponse.json({ error: motivo }, { status: 502 });
    }

    // Validar etiqueta_ids
    const idsValidos = new Set(parsed.data.etiquetasDisponiveis.map((e) => e.id));
    const FIBONACCI = [1, 2, 3, 5, 8, 13];

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
