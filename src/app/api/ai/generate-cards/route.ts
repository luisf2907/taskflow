import { createServerClient } from "@/lib/supabase/server";
import { applyRateLimitAsync, validateBody, stripFormatting } from "@/lib/api-utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
    ? `\n\nETIQUETAS DISPONIVEIS (use o "id" exato para atribuir):
${etiquetas.map((e) => `- id: "${e.id}" | nome: "${e.nome}"`).join("\n")}

Para cada card, inclua "etiqueta_ids" com array dos IDs das etiquetas que fazem sentido. Se nenhuma se encaixar, deixe array vazio.`
    : "";

  return `Voce e um assistente de project management. Quebre requisitos em cards de tarefa.

REGRAS:
1. Quebre o texto em cards independentes e acionaveis
2. Cada card DEVE ter:
   - "titulo": frase curta, clara e imperativa (ex: "Implementar login com Google"). NAO use formato user story no titulo.
   - "descricao": comece com a user story no formato "Como [persona], quero [acao] para [beneficio]." seguida de 1-2 frases tecnicas explicando a implementacao.
   - "peso": estimativa em fibonacci (1, 2, 3, 5, 8, 13) baseada na complexidade
   - "checklist": array de strings com criterios de aceitacao claros e verificaveis (3-6 itens)
   - "etiqueta_ids": array de IDs de etiquetas que se aplicam (pode ser vazio)
3. Minimo 1 card, maximo 10 cards
4. Nao repita cards nem invente funcionalidades nao mencionadas
5. Retorne APENAS JSON array valido
6. FORMATACAO: Use APENAS texto plano. Proibido: markdown (**, ##, -, *, \`, [], ()), emojis, HTML. Use quebras de linha simples (\\n) para separar paragrafos.${etiquetasSection}

EXEMPLO:
[
  {
    "titulo": "Implementar login com Google",
    "descricao": "Como usuario, quero fazer login com minha conta Google para acessar o sistema rapidamente sem criar senha.\n\nIntegrar OAuth 2.0 do Google na tela de login existente.",
    "peso": 5,
    "checklist": ["Botao 'Entrar com Google' na tela de login", "Redirect para consent screen do Google", "Callback OAuth salva token e cria sessao", "Tratar erro de autenticacao negada"],
    "etiqueta_ids": []
  }
]`;
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

  // Check API key
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

    const prompt = buildPrompt(etiquetas);
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: `${prompt}\n\nTexto do usuario:\n${texto}` }] },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();

    // Parse JSON (com fallback via Gemini Flash Lite)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cards = await parseAIResponse<Array<Record<string, any>>>(responseText, "array", apiKey);
    if (!cards) {
      return NextResponse.json(
        { error: "A IA retornou um formato invalido. Tente novamente." },
        { status: 502 }
      );
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
