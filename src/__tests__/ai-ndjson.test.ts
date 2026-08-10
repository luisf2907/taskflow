import { describe, expect, it } from "vitest";
import { lerNdjson, separarLinhas } from "@/lib/ai/ndjson";

function streamDe(pedacos: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const p of pedacos) controller.enqueue(enc.encode(p));
      controller.close();
    },
  });
}

describe("separarLinhas", () => {
  it("guarda a linha incompleta no resto", () => {
    const r = separarLinhas('{"a":1}\n{"b":2}\n{"c":');
    expect(r.linhas).toEqual(['{"a":1}', '{"b":2}']);
    expect(r.resto).toBe('{"c":');
  });

  it("nao devolve linha vazia", () => {
    expect(separarLinhas("\n\n").linhas).toEqual([]);
  });
});

describe("lerNdjson", () => {
  it("remonta evento partido entre dois chunks", async () => {
    const eventos: Record<string, unknown>[] = [];
    await lerNdjson(streamDe(['{"tipo":"ini', 'cio","lotes":2}\n']), (e) => eventos.push(e));
    expect(eventos).toEqual([{ tipo: "inicio", lotes: 2 }]);
  });

  it("le varios eventos em sequencia", async () => {
    const eventos: Record<string, unknown>[] = [];
    await lerNdjson(
      streamDe(['{"tipo":"lote","feito":1}\n{"tipo":"lote","feito":2}\n', '{"tipo":"fim"}\n']),
      (e) => eventos.push(e)
    );
    expect(eventos.map((e) => e.tipo)).toEqual(["lote", "lote", "fim"]);
  });

  it("aceita ultima linha sem quebra no fim", async () => {
    const eventos: Record<string, unknown>[] = [];
    await lerNdjson(streamDe(['{"tipo":"fim","cards":[]}']), (e) => eventos.push(e));
    expect(eventos).toHaveLength(1);
  });

  it("pula linha malformada sem perder a seguinte", async () => {
    const eventos: Record<string, unknown>[] = [];
    await lerNdjson(streamDe(['{quebrado\n{"tipo":"fim"}\n']), (e) => eventos.push(e));
    expect(eventos).toEqual([{ tipo: "fim" }]);
  });
});
