// ═══════════════════════════════════════════════════════════════════════
// Leitura de NDJSON — puro, testado em src/__tests__/ai-ndjson.test.ts
// ═══════════════════════════════════════════════════════════════════════
// Um chunk da rede nao respeita fronteira de linha: pode trazer duas
// linhas e meia. O resto tem que ficar guardado ate o proximo chunk, senao
// o JSON parcial e descartado e o evento se perde.
// ═══════════════════════════════════════════════════════════════════════

export function separarLinhas(buffer: string): { linhas: string[]; resto: string } {
  const partes = buffer.split("\n");
  const resto = partes.pop() ?? "";
  return { linhas: partes.filter((l) => l.trim().length > 0), resto };
}

/**
 * Consome o corpo da resposta chamando `onEvento` a cada linha JSON.
 *
 * Linha malformada e ignorada em vez de derrubar a leitura: o evento
 * seguinte pode ser justamente o `fim` com os cards.
 */
export async function lerNdjson(
  body: ReadableStream<Uint8Array>,
  onEvento: (evento: Record<string, unknown>) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { linhas, resto } = separarLinhas(buffer);
    buffer = resto;
    for (const linha of linhas) {
      try {
        onEvento(JSON.parse(linha) as Record<string, unknown>);
      } catch {
        // linha truncada ou ruido — segue
      }
    }
  }

  const final = buffer.trim();
  if (final) {
    try {
      onEvento(JSON.parse(final) as Record<string, unknown>);
    } catch {
      // idem
    }
  }
}
