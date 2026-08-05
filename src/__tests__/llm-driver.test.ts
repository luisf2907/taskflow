import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OpenAiCompatLlmDriver,
  normalizarBase,
  paraJsonSchema,
} from "@/lib/drivers/llm/openai-compat";
import { obterLlm } from "@/lib/drivers/llm";

// ═══════════════════════════════════════════════════════════════════════
// Driver de LLM
// ═══════════════════════════════════════════════════════════════════════
// O caminho do Ollama nao pode ser exercitado contra um servidor real no
// CI, entao o que se testa aqui e o CONTRATO HTTP: qual corpo sai, como a
// escada de degradacao reage a um 400, e se o laco de ferramentas monta a
// sequencia de mensagens que o padrao OpenAI exige.
//
// E o que separa "compila" de "provavelmente funciona".
// ═══════════════════════════════════════════════════════════════════════

const ESQUEMA = {
  type: "object",
  properties: {
    descricao: { type: "string" },
    peso: { type: "number", nullable: true },
  },
  required: ["descricao"],
};

function respostaOk(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function resposta400(detalhe = "unsupported response_format") {
  return {
    ok: false,
    status: 400,
    text: async () => detalhe,
    json: async () => ({ error: detalhe }),
  } as unknown as Response;
}

function corpoDaChamada(mock: ReturnType<typeof vi.fn>, indice: number) {
  return JSON.parse(mock.mock.calls[indice][1].body as string);
}

describe("normalizarBase", () => {
  it("acrescenta /v1 quando falta — o Ollama se apresenta sem ele", () => {
    expect(normalizarBase("http://ollama:11434")).toBe("http://ollama:11434/v1");
  });

  it("nao duplica /v1 quando ja veio na URL", () => {
    expect(normalizarBase("http://ollama:11434/v1")).toBe(
      "http://ollama:11434/v1",
    );
  });

  it("tolera barra no fim", () => {
    expect(normalizarBase("http://ollama:11434/")).toBe(
      "http://ollama:11434/v1",
    );
  });

  it("preserva outra versao de API", () => {
    expect(normalizarBase("https://api.exemplo.com/v2")).toBe(
      "https://api.exemplo.com/v2",
    );
  });
});

describe("paraJsonSchema", () => {
  it("converte nullable do OpenAPI em uniao com null", () => {
    const saida = paraJsonSchema({ type: "number", nullable: true }) as Record<
      string,
      unknown
    >;
    expect(saida.type).toEqual(["number", "null"]);
    expect(saida).not.toHaveProperty("nullable");
  });

  it("desce em propriedades aninhadas", () => {
    const saida = paraJsonSchema(ESQUEMA) as {
      properties: { peso: { type: unknown } };
    };
    expect(saida.properties.peso.type).toEqual(["number", "null"]);
  });

  it("preserva o que ja e JSON Schema valido", () => {
    const entrada = {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    };
    expect(paraJsonSchema(entrada)).toEqual(entrada);
  });
});

describe("OpenAiCompatLlmDriver.gerarJson", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const driver = () =>
    new OpenAiCompatLlmDriver({
      nome: "ollama",
      baseUrl: "http://ollama:11434",
      modelo: "llama3.1",
    });

  it("pede json_schema na primeira tentativa e devolve o conteudo", async () => {
    fetchMock.mockResolvedValueOnce(
      respostaOk({
        choices: [{ finish_reason: "stop", message: { content: '{"a":1}' } }],
      }),
    );

    const r = await driver().gerarJson({ prompt: "oi", esquema: ESQUEMA });

    expect(r.texto).toBe('{"a":1}');
    expect(r.motivoParada).toBe("fim");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://ollama:11434/v1/chat/completions");
    const corpo = JSON.parse(init.body as string);
    expect(corpo.model).toBe("llama3.1");
    expect(corpo.response_format.type).toBe("json_schema");
    // O nullable tem que ter sido traduzido antes de sair.
    expect(corpo.response_format.json_schema.schema.properties.peso.type).toEqual([
      "number",
      "null",
    ]);
  });

  it("cai para json_object quando o servidor recusa json_schema com 400", async () => {
    fetchMock
      .mockResolvedValueOnce(resposta400())
      .mockResolvedValueOnce(
        respostaOk({ choices: [{ message: { content: "{}" } }] }),
      );

    const r = await driver().gerarJson({ prompt: "oi", esquema: ESQUEMA });

    expect(r.texto).toBe("{}");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(corpoDaChamada(fetchMock, 1).response_format).toEqual({
      type: "json_object",
    });
    // Sem json_schema o modelo precisa da forma no prompt.
    expect(corpoDaChamada(fetchMock, 1).messages[0].content).toContain(
      "JSON valido neste formato",
    );
  });

  it("cai para request sem response_format quando nem json_object passa", async () => {
    fetchMock
      .mockResolvedValueOnce(resposta400())
      .mockResolvedValueOnce(resposta400())
      .mockResolvedValueOnce(
        respostaOk({ choices: [{ message: { content: "{}" } }] }),
      );

    await driver().gerarJson({ prompt: "oi", esquema: ESQUEMA });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(corpoDaChamada(fetchMock, 2)).not.toHaveProperty("response_format");
  });

  it("NAO desce a escada quando o erro nao e 400 — timeout falharia igual", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    } as unknown as Response);

    await expect(
      driver().gerarJson({ prompt: "oi", esquema: ESQUEMA }),
    ).rejects.toThrow(/500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("normaliza finish_reason=length como limite de tokens", async () => {
    fetchMock.mockResolvedValueOnce(
      respostaOk({
        choices: [{ finish_reason: "length", message: { content: "{" } }],
      }),
    );
    const r = await driver().gerarJson({ prompt: "oi" });
    expect(r.motivoParada).toBe("limite_tokens");
  });

  it("nao manda Authorization quando nao ha chave — Ollama nao exige", async () => {
    fetchMock.mockResolvedValueOnce(
      respostaOk({ choices: [{ message: { content: "{}" } }] }),
    );
    await driver().gerarJson({ prompt: "oi" });
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty(
      "Authorization",
    );
  });
});

describe("OpenAiCompatLlmDriver.conversarComFerramentas", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const driver = () =>
    new OpenAiCompatLlmDriver({
      nome: "ollama",
      baseUrl: "http://ollama:11434",
    });

  const ferramentas = [
    {
      nome: "consultar_cards",
      descricao: "busca cards",
      parametros: { type: "object", properties: {} },
    },
  ];

  it("executa a ferramenta e devolve o resultado na mensagem role=tool", async () => {
    fetchMock
      .mockResolvedValueOnce(
        respostaOk({
          choices: [
            {
              finish_reason: "tool_calls",
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "consultar_cards",
                      arguments: '{"apenas_pendentes":true}',
                    },
                  },
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        respostaOk({ choices: [{ message: { content: "Tem 3 cards." } }] }),
      );

    const executar = vi.fn().mockResolvedValue({ total: 3 });

    const texto = await driver().conversarComFerramentas({
      systemInstruction: "seja util",
      historico: [],
      pergunta: "quantos cards pendentes?",
      ferramentas,
      executar,
    });

    expect(texto).toBe("Tem 3 cards.");
    expect(executar).toHaveBeenCalledWith("consultar_cards", {
      apenas_pendentes: true,
    });

    // A segunda ida tem que carregar a conversa inteira: system, pergunta,
    // a chamada do assistant e o resultado da ferramenta com o mesmo id.
    const msgs = corpoDaChamada(fetchMock, 1).messages;
    expect(msgs[0]).toEqual({ role: "system", content: "seja util" });
    expect(msgs[1]).toEqual({
      role: "user",
      content: "quantos cards pendentes?",
    });
    expect(msgs[2].role).toBe("assistant");
    expect(msgs[2].tool_calls).toHaveLength(1);
    expect(msgs[3]).toEqual({
      role: "tool",
      tool_call_id: "call_1",
      content: '{"total":3}',
    });
  });

  it("traduz o historico de 'assistant' e responde sem chamar ferramenta", async () => {
    fetchMock.mockResolvedValueOnce(
      respostaOk({ choices: [{ message: { content: "Oi de novo." } }] }),
    );

    await driver().conversarComFerramentas({
      systemInstruction: "s",
      historico: [
        { papel: "user", texto: "oi" },
        { papel: "assistant", texto: "ola" },
      ],
      pergunta: "tudo bem?",
      ferramentas,
      executar: vi.fn(),
    });

    const msgs = corpoDaChamada(fetchMock, 0).messages;
    expect(msgs.map((m: { role: string }) => m.role)).toEqual([
      "system",
      "user",
      "assistant",
      "user",
    ]);
  });

  it("sobrevive a argumentos malformados — modelo pequeno erra o JSON", async () => {
    fetchMock
      .mockResolvedValueOnce(
        respostaOk({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "c1",
                    type: "function",
                    function: { name: "consultar_cards", arguments: "{nao json" },
                  },
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        respostaOk({ choices: [{ message: { content: "ok" } }] }),
      );

    const executar = vi.fn().mockResolvedValue({ total: 0 });
    const texto = await driver().conversarComFerramentas({
      systemInstruction: "s",
      historico: [],
      pergunta: "p",
      ferramentas,
      executar,
    });

    expect(texto).toBe("ok");
    expect(executar).toHaveBeenCalledWith("consultar_cards", {});
  });
});

describe("obterLlm", () => {
  const envOriginal = { ...process.env };

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  function comEnv(vars: Record<string, string | undefined>) {
    for (const chave of [
      "LLM_DRIVER",
      "LLM_BASE_URL",
      "LLM_MODEL",
      "LLM_API_KEY",
      "GEMINI_API_KEY",
    ]) {
      delete process.env[chave];
    }
    Object.assign(process.env, vars);
    return obterLlm();
  }

  it("ollama com base url monta o driver", () => {
    const r = comEnv({
      LLM_DRIVER: "ollama",
      LLM_BASE_URL: "http://ollama:11434",
      LLM_MODEL: "qwen2.5",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.driver.nome).toBe("ollama");
      expect(r.driver.modelo).toBe("qwen2.5");
    }
  });

  it("ollama sem base url diz exatamente o que falta", () => {
    const r = comEnv({ LLM_DRIVER: "ollama" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("LLM_BASE_URL");
  });

  it("usa o default do driver quando LLM_MODEL nao vem", () => {
    const r = comEnv({
      LLM_DRIVER: "ollama",
      LLM_BASE_URL: "http://ollama:11434",
    });
    if (r.ok) expect(r.driver.modelo).toBe("llama3.1");
  });

  it("sem LLM_DRIVER, cai em gemini se houver GEMINI_API_KEY (compat)", () => {
    const r = comEnv({ GEMINI_API_KEY: "abc" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.driver.nome).toBe("gemini");
  });

  it("sem nada configurado, devolve motivo em vez de driver quebrado", () => {
    const r = comEnv({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("LLM_DRIVER");
  });

  it("anthropic avisa que nao ha driver, em vez de fingir que funciona", () => {
    const r = comEnv({ LLM_DRIVER: "anthropic", LLM_API_KEY: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain("anthropic");
  });

  it("gemini respeita LLM_MODEL", () => {
    const r = comEnv({
      LLM_DRIVER: "gemini",
      GEMINI_API_KEY: "abc",
      LLM_MODEL: "gemini-2.5-pro",
    });
    if (r.ok) expect(r.driver.modelo).toBe("gemini-2.5-pro");
  });
});
