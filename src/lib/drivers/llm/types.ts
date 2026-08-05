// ═══════════════════════════════════════════════════════════════════════
// Contrato dos drivers de LLM
// ═══════════════════════════════════════════════════════════════════════
// As quatro rotas de IA falavam direto com o SDK do Gemini. Este contrato
// e o que permite trocar de provedor por variavel de ambiente.
//
// Duas operacoes cobrem tudo que as rotas precisam:
//
//   gerarJson              — uma ida, saida estruturada (generate-cards,
//                            enhance-card, summarize-reuniao)
//   conversarComFerramentas— multi-turno com function calling (ask)
//
// O LACO DE FUNCTION CALLING VIVE NO DRIVER, nao na rota. Gemini e
// OpenAI-compat expressam isso de formas incompativeis (`functionCalls()`
// + `Part[]` de resposta contra `tool_calls` + mensagens `role: "tool"`).
// A rota fornece apenas `executar`, um callback que recebe nome e
// argumentos e devolve o resultado — e assim nao sabe qual provedor esta
// atendendo.
//
// Os esquemas sao JSON Schema puro. Isso funciona para os dois lados: o
// enum SchemaType do SDK do Gemini tem exatamente os valores de string do
// JSON Schema ("object", "string", "array", ...), entao o mesmo objeto
// serve para `responseSchema` do Gemini e para `response_format` do
// endpoint OpenAI-compativel.
// ═══════════════════════════════════════════════════════════════════════

export type EsquemaJson = Record<string, unknown>;

export interface FerramentaLlm {
  nome: string;
  descricao: string;
  /** JSON Schema dos parametros. Use `{ type: "object", properties: {} }` para nenhum. */
  parametros: EsquemaJson;
}

export interface MensagemChat {
  papel: "user" | "assistant";
  texto: string;
}

export interface ParamsGerarJson {
  prompt: string;
  /** Ausente = so pede JSON, sem forcar formato. */
  esquema?: EsquemaJson;
  temperatura?: number;
  maxTokens?: number;
}

export interface ParamsConversa {
  systemInstruction: string;
  historico: MensagemChat[];
  pergunta: string;
  ferramentas: FerramentaLlm[];
  executar: (
    nome: string,
    argumentos: Record<string, unknown>,
  ) => Promise<unknown>;
  /** Teto de idas ao modelo. Default 5 — evita laco infinito. */
  maxRodadas?: number;
}

/**
 * Por que a geracao parou, normalizado entre provedores.
 *
 * As rotas usam isso para dar erro util em vez de "formato invalido":
 * estourar o teto de tokens e o filtro de conteudo pedem mensagens
 * diferentes. O Gemini chama de MAX_TOKENS/SAFETY, o padrao OpenAI de
 * length/content_filter — a rota nao precisa saber de nenhum dos dois.
 */
export type MotivoParada = "fim" | "limite_tokens" | "bloqueado" | "outro";

export interface RespostaGeracao {
  texto: string;
  motivoParada: MotivoParada;
}

export interface LlmDriver {
  /** Identificador do provedor, para log e diagnostico. */
  readonly nome: string;
  /** Modelo efetivamente em uso. */
  readonly modelo: string;

  /** Devolve o texto bruto da resposta. Quem chama parseia. */
  gerarJson(params: ParamsGerarJson): Promise<RespostaGeracao>;

  /** Roda o laco de ferramentas ate o modelo responder em texto. */
  conversarComFerramentas(params: ParamsConversa): Promise<string>;

  /**
   * Ultima tentativa quando o JSON volta quebrado. Usada por
   * `parseAIResponse`. Devolve o texto corrigido, ou null se nao
   * conseguir — o driver nunca deve lancar aqui.
   */
  repararJson(
    texto: string,
    formato: "object" | "array",
  ): Promise<string | null>;
}

/**
 * Resultado da selecao de driver.
 *
 * Discriminado de proposito: quando a configuracao esta incompleta as
 * rotas precisam dizer O QUE falta ("LLM_DRIVER=ollama exige
 * LLM_BASE_URL"), e nao um generico "IA nao configurada" — que foi
 * exatamente o que tornou dificil descobrir que a GEMINI_API_KEY nem
 * chegava ao container.
 */
export type SelecaoLlm =
  | { ok: true; driver: LlmDriver }
  | { ok: false; motivo: string };
