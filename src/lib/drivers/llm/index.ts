import { GeminiLlmDriver } from "./gemini";
import { OpenAiCompatLlmDriver } from "./openai-compat";
import type { SelecaoLlm } from "./types";

export type {
  EsquemaJson,
  FerramentaLlm,
  LlmDriver,
  MensagemChat,
  SelecaoLlm,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════
// Fabrica de driver de LLM
// ═══════════════════════════════════════════════════════════════════════
// SERVER-ONLY. Le LLM_API_KEY e GEMINI_API_KEY — nunca importe de client
// component.
//
// Variaveis:
//   LLM_DRIVER    gemini | ollama | openai-compat | anthropic | disabled
//   LLM_BASE_URL  obrigatoria em ollama e openai-compat
//   LLM_MODEL     opcional; cada driver tem seu default
//   LLM_API_KEY   opcional no ollama, geralmente obrigatoria no compat
//
// Quando LLM_DRIVER nao esta definida, cai em gemini se houver
// GEMINI_API_KEY — que era o comportamento anterior a existir driver
// nenhum, e o que mantem instalacoes antigas funcionando sem editar env.
// ═══════════════════════════════════════════════════════════════════════

export function obterLlm(): SelecaoLlm {
  const configurado = process.env.LLM_DRIVER?.trim();
  const driver =
    configurado || (process.env.GEMINI_API_KEY ? "gemini" : "disabled");

  const modelo = process.env.LLM_MODEL?.trim() || undefined;
  const baseUrl = process.env.LLM_BASE_URL?.trim() || undefined;
  const apiKey = process.env.LLM_API_KEY?.trim() || undefined;

  switch (driver) {
    case "disabled":
      return {
        ok: false,
        motivo:
          "IA nao configurada. Defina LLM_DRIVER (gemini, ollama ou openai-compat).",
      };

    case "gemini": {
      // GEMINI_API_KEY tem precedencia por compatibilidade: era a unica
      // variavel que existia antes desta abstracao.
      const chave = process.env.GEMINI_API_KEY?.trim() || apiKey;
      if (!chave) {
        return {
          ok: false,
          motivo: "LLM_DRIVER=gemini exige GEMINI_API_KEY (ou LLM_API_KEY).",
        };
      }
      return { ok: true, driver: new GeminiLlmDriver(chave, modelo) };
    }

    case "ollama": {
      if (!baseUrl) {
        return {
          ok: false,
          motivo:
            "LLM_DRIVER=ollama exige LLM_BASE_URL (ex: http://ollama:11434).",
        };
      }
      return {
        ok: true,
        driver: new OpenAiCompatLlmDriver({
          nome: "ollama",
          baseUrl,
          modelo,
          apiKey,
        }),
      };
    }

    case "openai-compat": {
      if (!baseUrl) {
        return {
          ok: false,
          motivo: "LLM_DRIVER=openai-compat exige LLM_BASE_URL.",
        };
      }
      return {
        ok: true,
        driver: new OpenAiCompatLlmDriver({
          nome: "openai-compat",
          baseUrl,
          modelo,
          apiKey,
        }),
      };
    }

    case "anthropic":
      return {
        ok: false,
        motivo:
          "LLM_DRIVER=anthropic ainda nao tem driver. Use gemini, ollama ou openai-compat.",
      };

    default:
      return { ok: false, motivo: `LLM_DRIVER invalido: "${driver}".` };
  }
}
