import { createServerClient } from "@/lib/supabase/server";
import { applyRateLimitAsync, validateBody, stripFormatting } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
    ? `\nETIQUETAS DISPONIVEIS (use o "id" exato):
${data.etiquetasDisponiveis.map((e) => `- id: "${e.id}" | nome: "${e.nome}"`).join("\n")}
Etiquetas ja atribuidas: ${temEtiquetas ? data.etiquetaIdsAtuais.map((id) => `"${id}"`).join(", ") : "nenhuma"}`
    : "";

  return `Voce e um assistente de project management. Melhore um card de tarefa existente.

CARD ATUAL:
- Titulo: "${data.titulo}"
- Descricao: ${temDescricao ? `"${data.descricao}"` : "(vazia)"}
- Story Points: ${data.peso ?? "(nao definido)"}
- Checklist atual: ${temChecklist ? data.checklistItens.map((i) => `"${i}"`).join(", ") : "(nenhum)"}
${etiquetasSection}

REGRAS:
1. "descricao": ${temDescricao ? "Melhore a descricao existente mantendo o conteudo original. Adicione user story no inicio se nao tiver." : "Crie descricao comecando com user story 'Como [persona], quero [acao] para [beneficio].' seguida de detalhes tecnicos."}
2. "checklist_novos": array de NOVOS itens de checklist para ADICIONAR (criterios de aceitacao que faltam). SEMPRE gere pelo menos 3 itens. ${temChecklist ? "NAO repita itens que ja existem, adicione apenas novos criterios." : "Gere 3-6 criterios de aceitacao claros e verificaveis."}
3. "etiqueta_ids": array COMPLETO de IDs de etiquetas que devem estar no card (incluindo as ja atribuidas se fizerem sentido, mais novas se aplicavel). Se nenhuma se encaixar, retorne array vazio.
4. "peso_sugerido": se nao tem peso definido, sugira em fibonacci (1,2,3,5,8,13). Se ja tem, retorne null.
5. Retorne APENAS um JSON object valido
6. FORMATACAO: Use APENAS texto plano. Proibido: markdown (**, ##, -, *, \`, [], ()), emojis, HTML. Use quebras de linha simples (\\n) para separar paragrafos.

EXEMPLO:
{
  "descricao": "Como usuario, quero fazer login com Google para acessar rapidamente.\\n\\nIntegrar OAuth 2.0 na tela de login existente com callback e tratamento de erros.",
  "checklist_novos": ["Testar em mobile", "Tratar timeout de rede"],
  "etiqueta_ids": ["id1", "id2"],
  "peso_sugerido": 5
}`;
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = buildPrompt(parsed.data);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();

    // Parse JSON (com fallback via Gemini Flash Lite)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await parseAIResponse<Record<string, any>>(responseText, "object", apiKey);
    if (!data) {
      return NextResponse.json({ error: "A IA retornou formato invalido. Tente novamente." }, { status: 502 });
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
