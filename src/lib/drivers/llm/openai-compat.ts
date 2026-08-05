import type {
  LlmDriver,
  MotivoParada,
  ParamsConversa,
  ParamsGerarJson,
  RespostaGeracao,
} from "./types";
import { promptReparo } from "./gemini";

// ═══════════════════════════════════════════════════════════════════════
// Driver OpenAI-compativel — atende `ollama` e `openai-compat`
// ═══════════════════════════════════════════════════════════════════════
// O Ollama expoe /v1/chat/completions no formato da OpenAI, entao um unico
// driver cobre Ollama local, vLLM, LM Studio, llama.cpp server, Groq,
// OpenRouter e a propria OpenAI. A diferenca entre `ollama` e
// `openai-compat` fica so no default de LLM_API_KEY (o Ollama nao exige).
//
// SEM SDK, so fetch. Adicionar o SDK da OpenAI traria ~1 MB ao bundle do
// servidor para usar um unico endpoint.
// ═══════════════════════════════════════════════════════════════════════

// Modelo local carregando pela primeira vez pode demorar minutos. Um
// timeout curto transformaria "primeira pergunta do dia" em erro.
const TIMEOUT_MS = 300_000;

const MODELO_PADRAO = "llama3.1";

interface MensagemApi {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCallApi[];
  tool_call_id?: string;
}

interface ToolCallApi {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface RespostaApi {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | null;
      tool_calls?: ToolCallApi[];
    };
  }>;
}

function normalizarMotivo(finishReason: string | undefined): MotivoParada {
  switch (finishReason) {
    case "length":
      return "limite_tokens";
    case "content_filter":
      return "bloqueado";
    case "stop":
    case "tool_calls":
    case undefined:
      return "fim";
    default:
      return "outro";
  }
}

/**
 * `http://ollama:11434` → `http://ollama:11434/v1`
 *
 * O env.ts documenta a base sem o /v1 (é como o Ollama se apresenta), mas
 * quem vem de outro provedor costuma colar a URL ja com ele. Aceitamos as
 * duas para nao transformar isso em erro de configuracao silencioso.
 */
export function normalizarBase(baseUrl: string): string {
  const limpa = baseUrl.trim().replace(/\/+$/, "");
  return /\/v\d+$/.test(limpa) ? limpa : `${limpa}/v1`;
}

/**
 * JSON Schema do Gemini → JSON Schema que servidores OpenAI-compativeis
 * aceitam.
 *
 * O unico ponto de atrito real e `nullable: true`, que vem do OpenAPI e
 * nao existe em JSON Schema — la o equivalente e o tipo como uniao com
 * "null". Deixar passar faz servidores em modo estrito rejeitarem o
 * schema inteiro.
 */
export function paraJsonSchema(esquema: unknown): unknown {
  if (Array.isArray(esquema)) return esquema.map(paraJsonSchema);
  if (!esquema || typeof esquema !== "object") return esquema;

  const entrada = esquema as Record<string, unknown>;
  const saida: Record<string, unknown> = {};

  for (const [chave, valor] of Object.entries(entrada)) {
    if (chave === "nullable") continue;
    saida[chave] = paraJsonSchema(valor);
  }

  if (entrada.nullable === true && typeof entrada.type === "string") {
    saida.type = [entrada.type, "null"];
  }

  return saida;
}

export class OpenAiCompatLlmDriver implements LlmDriver {
  readonly nome: string;
  readonly modelo: string;
  private readonly base: string;
  private readonly apiKey?: string;

  constructor(opts: {
    nome: string;
    baseUrl: string;
    modelo?: string;
    apiKey?: string;
  }) {
    this.nome = opts.nome;
    this.base = normalizarBase(opts.baseUrl);
    this.modelo = opts.modelo?.trim() || MODELO_PADRAO;
    this.apiKey = opts.apiKey?.trim() || undefined;
  }

  private async chamar(corpo: Record<string, unknown>): Promise<RespostaApi> {
    const resp = await fetch(`${this.base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: this.modelo, ...corpo }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      throw new ErroLlm(resp.status, detalhe.slice(0, 500));
    }

    return (await resp.json()) as RespostaApi;
  }

  async gerarJson({
    prompt,
    esquema,
    temperatura = 0.3,
    maxTokens = 4000,
  }: ParamsGerarJson): Promise<RespostaGeracao> {
    const base = {
      messages: [{ role: "user" as const, content: prompt }],
      temperature: temperatura,
      max_tokens: maxTokens,
    };

    // Escada de degradacao. O suporte a saida estruturada varia muito
    // entre servidores e entre versoes do Ollama, e a falha aparece como
    // 400 no primeiro request — nao como resposta ruim. Descer um degrau
    // por vez mantem o melhor formato que aquele servidor aceita, em vez
    // de exigir a configuracao mais nova de todos.
    const tentativas: Array<Record<string, unknown>> = [];

    if (esquema) {
      tentativas.push({
        ...base,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "resposta",
            schema: paraJsonSchema(esquema),
          },
        },
      });
    }

    // Sem json_schema o modelo precisa da forma no proprio prompt.
    const promptComEsquema = esquema
      ? `${prompt}\n\nResponda APENAS com JSON valido neste formato:\n${JSON.stringify(
          paraJsonSchema(esquema),
        )}`
      : `${prompt}\n\nResponda APENAS com JSON valido.`;

    const comInstrucao = {
      ...base,
      messages: [{ role: "user" as const, content: promptComEsquema }],
    };

    tentativas.push({ ...comInstrucao, response_format: { type: "json_object" } });
    tentativas.push(comInstrucao);

    let ultimoErro: unknown;
    for (const corpo of tentativas) {
      try {
        const data = await this.chamar(corpo);
        return {
          texto: data.choices?.[0]?.message?.content ?? "",
          motivoParada: normalizarMotivo(data.choices?.[0]?.finish_reason),
        };
      } catch (err) {
        ultimoErro = err;
        // Só faz sentido tentar o proximo degrau quando o servidor
        // recusou o formato. Timeout, modelo inexistente e servidor fora
        // do ar falhariam igual nas tres tentativas.
        if (!(err instanceof ErroLlm) || err.status !== 400) throw err;
      }
    }
    throw ultimoErro;
  }

  async conversarComFerramentas({
    systemInstruction,
    historico,
    pergunta,
    ferramentas,
    executar,
    maxRodadas = 5,
  }: ParamsConversa): Promise<string> {
    const mensagens: MensagemApi[] = [
      { role: "system", content: systemInstruction },
      ...historico.map((h) => ({
        role: h.papel === "assistant" ? ("assistant" as const) : ("user" as const),
        content: h.texto,
      })),
      { role: "user", content: pergunta },
    ];

    const tools = ferramentas.map((f) => ({
      type: "function" as const,
      function: {
        name: f.nome,
        description: f.descricao,
        parameters: paraJsonSchema(f.parametros),
      },
    }));

    for (let rodada = 0; rodada <= maxRodadas; rodada++) {
      const data = await this.chamar({ messages: mensagens, tools });
      const msg = data.choices?.[0]?.message;
      const chamadas = msg?.tool_calls ?? [];

      if (chamadas.length === 0) return (msg?.content ?? "").trim();

      mensagens.push({
        role: "assistant",
        content: msg?.content ?? null,
        tool_calls: chamadas,
      });

      for (const chamada of chamadas) {
        let argumentos: Record<string, unknown> = {};
        try {
          argumentos = chamada.function.arguments
            ? (JSON.parse(chamada.function.arguments) as Record<string, unknown>)
            : {};
        } catch {
          // Modelo pequeno as vezes emite argumentos malformados. Chamar a
          // ferramenta sem filtro e melhor que abortar a conversa inteira.
        }
        const out = await executar(chamada.function.name, argumentos);
        mensagens.push({
          role: "tool",
          tool_call_id: chamada.id,
          content: JSON.stringify(out ?? null),
        });
      }
    }

    // Estourou o teto de rodadas: pede a resposta final sem ferramentas,
    // para nao devolver vazio depois de ja ter buscado os dados.
    const final = await this.chamar({ messages: mensagens });
    return (final.choices?.[0]?.message?.content ?? "").trim();
  }

  async repararJson(
    texto: string,
    formato: "object" | "array",
  ): Promise<string | null> {
    try {
      const data = await this.chamar({
        messages: [{ role: "user", content: promptReparo(texto, formato) }],
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });
      return data.choices?.[0]?.message?.content ?? null;
    } catch {
      return null;
    }
  }
}

export class ErroLlm extends Error {
  constructor(
    readonly status: number,
    readonly detalhe: string,
  ) {
    super(`LLM respondeu ${status}: ${detalhe}`);
    this.name = "ErroLlm";
  }
}
