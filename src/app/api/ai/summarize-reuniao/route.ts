import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { applyRateLimitAsync, validateBody, stripFormatting } from "@/lib/api-utils";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseAIResponse } from "@/lib/ai-json-repair";
import type { ReuniaoFala } from "@/types";

const schema = z.object({
  reuniao_id: z.string().uuid("reuniao_id invalido"),
});

const PROMPT = `Voce e um assistente de reunioes de trabalho. Analise a transcricao abaixo e gere um JSON com:

1. "resumo": paragrafo executivo (3-5 frases) resumindo o que foi discutido, decisoes tomadas e contexto geral. Seja objetivo e profissional.
2. "pontos_chave": array de 3-8 strings com os pontos principais discutidos. Cada ponto deve ser uma frase curta e clara.
3. "tarefas": array de strings com action items/tarefas identificadas. Inclua quem ficou responsavel quando mencionado (ex: "Joao: revisar o PR do login"). Se nenhuma tarefa foi mencionada, retorne array vazio.

REGRAS:
- Use APENAS texto plano. Proibido: markdown, emojis, HTML.
- Seja conciso e profissional.
- Nao invente informacoes que nao estao na transcricao.
- Retorne APENAS um JSON object valido.

EXEMPLO:
{
  "resumo": "A equipe discutiu o progresso da sprint atual e alinhou prioridades para a proxima semana. O deploy da feature de notificacoes foi adiado por um bug critico no envio de emails. Ficou decidido que o time de backend foca na correcao enquanto frontend avanca com o redesign da dashboard.",
  "pontos_chave": ["Deploy de notificacoes adiado por bug no envio de emails", "Backend focara na correcao do bug", "Frontend avanca com redesign da dashboard"],
  "tarefas": ["Pedro: corrigir bug de envio de emails ate quarta", "Ana: criar mockups do novo dashboard"]
}`;

export async function POST(request: NextRequest) {
  const limited = await applyRateLimitAsync(request, "ai-summarize", {
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  // Auth
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  // Validation
  const parsed = await validateBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { reuniao_id } = parsed.data;

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "IA nao configurada. Adicione GEMINI_API_KEY nas variaveis de ambiente.",
      },
      { status: 503 }
    );
  }

  // Buscar reuniao + falas
  const service = createServiceClient();
  const [{ data: reuniao }, { data: falas }] = await Promise.all([
    service.from("reunioes").select("*").eq("id", reuniao_id).single(),
    service
      .from("reuniao_falas")
      .select("*")
      .eq("reuniao_id", reuniao_id)
      .order("ordem"),
  ]);

  if (!reuniao) {
    return NextResponse.json(
      { error: "Reuniao nao encontrada" },
      { status: 404 }
    );
  }

  if (!falas || falas.length === 0) {
    return NextResponse.json(
      { error: "Reuniao sem transcricao. Processe o audio primeiro." },
      { status: 400 }
    );
  }

  // Buscar nomes dos speakers (perfis dos usuarios identificados)
  const userIds = new Set<string>();
  (falas as ReuniaoFala[]).forEach((f) => {
    if (f.usuario_id) userIds.add(f.usuario_id);
  });

  const nomesPorId: Record<string, string> = {};
  if (userIds.size > 0) {
    const { data: perfis } = await service
      .from("perfis")
      .select("id, nome, email")
      .in("id", Array.from(userIds));
    (perfis || []).forEach((p) => {
      nomesPorId[p.id] = p.nome || p.email || "Desconhecido";
    });
  }

  // Formatar transcricao
  const transcricao = (falas as ReuniaoFala[])
    .map((f) => {
      const nome = f.usuario_id
        ? nomesPorId[f.usuario_id] || f.speaker_label
        : f.speaker_label;
      return `[${nome}]: ${f.texto}`;
    })
    .join("\n");

  // Chamar Gemini
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${PROMPT}\n\nTITULO DA REUNIAO: ${reuniao.titulo}\nDURACAO: ${
                typeof reuniao.duracao_seg === "number" &&
                Number.isFinite(reuniao.duracao_seg) &&
                reuniao.duracao_seg > 0
                  ? Math.round(reuniao.duracao_seg / 60) + " minutos"
                  : "desconhecida"
              }\n\nTRANSCRICAO:\n${transcricao}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();

    const data = await parseAIResponse<{
      resumo?: string;
      pontos_chave?: string[];
      tarefas?: string[];
    }>(responseText, "object", apiKey);

    if (!data || !data.resumo) {
      return NextResponse.json(
        { error: "A IA retornou um formato invalido. Tente novamente." },
        { status: 502 }
      );
    }

    // Sanitizar
    const resumoIa = {
      resumo: stripFormatting(String(data.resumo)).slice(0, 3000),
      pontos_chave: Array.isArray(data.pontos_chave)
        ? data.pontos_chave
            .slice(0, 10)
            .map((p: unknown) => stripFormatting(String(p || "")))
            .filter((s: string) => s.length > 0)
        : [],
      tarefas: Array.isArray(data.tarefas)
        ? data.tarefas
            .slice(0, 10)
            .map((t: unknown) => stripFormatting(String(t || "")))
            .filter((s: string) => s.length > 0)
        : [],
      gerado_em: new Date().toISOString(),
    };

    // Salvar no banco
    await service
      .from("reunioes")
      .update({ resumo_ia: resumoIa })
      .eq("id", reuniao_id);

    return NextResponse.json({ resumo_ia: resumoIa });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    logger.error(message, "ai-summarize-reuniao", { stack: err instanceof Error ? err.stack : undefined });
    if (message.includes("403") || message.includes("401")) {
      return NextResponse.json(
        { error: "Chave da IA invalida ou sem permissao." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: `Erro ao gerar resumo: ${message}` },
      { status: 500 }
    );
  }
}
