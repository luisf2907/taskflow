import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type Part,
  type Schema,
} from "@google/generative-ai";
import type {
  LlmDriver,
  MotivoParada,
  ParamsConversa,
  ParamsGerarJson,
  RespostaGeracao,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════
// Driver Gemini
// ═══════════════════════════════════════════════════════════════════════
// Preserva exatamente o comportamento que as quatro rotas tinham antes da
// extracao — mesmo modelo padrao, mesmo thinkingBudget, mesmo modelo de
// reparo. Trocar de driver nao deve mudar nada para quem ja usava Gemini.
// ═══════════════════════════════════════════════════════════════════════

const MODELO_PADRAO = "gemini-flash-latest";
const MODELO_REPARO = "gemini-2.0-flash-lite";

export class GeminiLlmDriver implements LlmDriver {
  readonly nome = "gemini";
  readonly modelo: string;
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string, modelo?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelo = modelo?.trim() || MODELO_PADRAO;
  }

  async gerarJson({
    prompt,
    esquema,
    temperatura = 0.3,
    maxTokens = 4000,
  }: ParamsGerarJson): Promise<RespostaGeracao> {
    const model = this.genAI.getGenerativeModel({ model: this.modelo });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: temperatura,
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
        // O JSON Schema passa direto: os valores do enum SchemaType sao as
        // proprias strings do JSON Schema.
        ...(esquema ? { responseSchema: esquema as unknown as Schema } : {}),
        // Thinking mode dos Gemini 2.5/3.x consome tokens de output
        // silenciosamente antes de responder. Desligar garante que o budget
        // vai todo pro JSON visivel. O SDK v0.24 ainda nao tipa
        // thinkingConfig, mas a API REST aceita.
        ...({ thinkingConfig: { thinkingBudget: 0 } } as object),
      },
    });

    return {
      texto: result.response.text(),
      motivoParada: normalizarMotivo(
        result.response.candidates?.[0]?.finishReason,
      ),
    };
  }

  async conversarComFerramentas({
    systemInstruction,
    historico,
    pergunta,
    ferramentas,
    executar,
    maxRodadas = 5,
  }: ParamsConversa): Promise<string> {
    const functionDeclarations: FunctionDeclaration[] = ferramentas.map(
      (f) => ({
        name: f.nome,
        description: f.descricao,
        parameters: f.parametros as unknown as FunctionDeclaration["parameters"],
      }),
    );

    const model = this.genAI.getGenerativeModel({
      model: this.modelo,
      systemInstruction,
      tools: [{ functionDeclarations }],
    });

    const chat = model.startChat({
      history: historico.map((h) => ({
        // O Gemini chama de "model" o que o resto do mundo chama de
        // "assistant".
        role: h.papel === "assistant" ? "model" : "user",
        parts: [{ text: h.texto }],
      })),
    });

    let result = await chat.sendMessage(pergunta);
    let rodadas = 0;

    while (rodadas < maxRodadas) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;
      rodadas++;

      const respostas: Part[] = [];
      for (const call of calls) {
        const out = await executar(
          call.name,
          (call.args || {}) as Record<string, unknown>,
        );
        respostas.push({
          functionResponse: { name: call.name, response: out as object },
        });
      }
      result = await chat.sendMessage(respostas);
    }

    return result.response.text().trim();
  }

  async repararJson(
    texto: string,
    formato: "object" | "array",
  ): Promise<string | null> {
    try {
      const model = this.genAI.getGenerativeModel({ model: MODELO_REPARO });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: promptReparo(texto, formato) }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        },
      });
      return result.response.text();
    } catch {
      return null;
    }
  }
}

function normalizarMotivo(finishReason: string | undefined): MotivoParada {
  switch (finishReason) {
    case "MAX_TOKENS":
      return "limite_tokens";
    case "SAFETY":
    case "RECITATION":
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
      return "bloqueado";
    case "STOP":
    case undefined:
      return "fim";
    default:
      return "outro";
  }
}

export function promptReparo(
  texto: string,
  formato: "object" | "array",
): string {
  return `O texto abaixo deveria ser um JSON ${
    formato === "array" ? "array" : "object"
  } valido, mas esta com formato quebrado. Corrija e retorne APENAS o JSON valido, sem nenhum texto extra.

Texto:
${texto.slice(0, 4000)}`;
}
