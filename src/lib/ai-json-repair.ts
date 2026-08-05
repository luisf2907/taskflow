import type { LlmDriver } from "@/lib/drivers/llm";

/**
 * Tenta parsear JSON. Se falhar, pede ao proprio driver de LLM que
 * corrija o formato.
 *
 * O terceiro parametro era a `apiKey` do Gemini, usada para chamar o
 * Flash Lite no reparo. Passou a ser o driver: com Ollama nao existe
 * chave do Gemini, e o reparo tem que acontecer no mesmo provedor que
 * gerou o texto quebrado.
 *
 * Nunca lanca — devolve null quando nao consegue.
 */
export async function parseAIResponse<T = unknown>(
  responseText: string,
  expectedFormat: "object" | "array",
  driver: LlmDriver,
): Promise<T | null> {
  const direto = tentarParsear<T>(responseText, expectedFormat);
  if (direto !== null) return direto;

  // Tentativa 2: extrair JSON do texto (bloco markdown, texto em volta).
  // Modelos locais sem saida estruturada caem muito neste caso.
  try {
    const pattern = expectedFormat === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = responseText.match(pattern);
    if (match) {
      const extraido = tentarParsear<T>(match[0], expectedFormat);
      if (extraido !== null) return extraido;
    }
  } catch {
    // continua
  }

  // Tentativa 3: pedir ao modelo que conserte.
  try {
    const corrigido = await driver.repararJson(responseText, expectedFormat);
    if (corrigido) {
      const reparado = tentarParsear<T>(corrigido, expectedFormat);
      if (reparado !== null) return reparado;
    }
  } catch {
    // fallback falhou
  }

  return null;
}

function tentarParsear<T>(
  texto: string,
  formato: "object" | "array",
): T | null {
  try {
    const parsed = JSON.parse(texto);
    if (formato === "array" && Array.isArray(parsed)) return parsed as T;
    if (formato === "object" && typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as T;
    }
  } catch {
    // nao e JSON valido
  }
  return null;
}
