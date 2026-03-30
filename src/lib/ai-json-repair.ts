import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Tenta parsear JSON. Se falhar, usa Gemini Flash Lite para corrigir o formato.
 * Retorna o objeto/array parseado ou null se nao conseguir.
 */
export async function parseAIResponse<T = unknown>(
  responseText: string,
  expectedFormat: "object" | "array",
  apiKey: string
): Promise<T | null> {
  // Tentativa 1: parse direto
  try {
    const parsed = JSON.parse(responseText);
    if (expectedFormat === "array" && Array.isArray(parsed)) return parsed as T;
    if (expectedFormat === "object" && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as T;
  } catch {
    // continua
  }

  // Tentativa 2: extrair JSON do texto (markdown code blocks, texto extra)
  try {
    const pattern = expectedFormat === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = responseText.match(pattern);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (expectedFormat === "array" && Array.isArray(parsed)) return parsed as T;
      if (expectedFormat === "object" && typeof parsed === "object") return parsed as T;
    }
  } catch {
    // continua
  }

  // Tentativa 3: usar Gemini Flash Lite para corrigir
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const repairModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const repairResult = await repairModel.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `O texto abaixo deveria ser um JSON ${expectedFormat === "array" ? "array" : "object"} valido, mas esta com formato quebrado. Corrija e retorne APENAS o JSON valido, sem nenhum texto extra.

Texto:
${responseText.slice(0, 4000)}`
        }],
      }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      },
    });

    const repairedText = repairResult.response.text();
    const repaired = JSON.parse(repairedText);

    if (expectedFormat === "array" && Array.isArray(repaired)) return repaired as T;
    if (expectedFormat === "object" && typeof repaired === "object" && !Array.isArray(repaired)) return repaired as T;
  } catch {
    // fallback falhou
  }

  return null;
}
