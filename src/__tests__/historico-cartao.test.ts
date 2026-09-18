import { describe, expect, it } from "vitest";

import {
  extremosDeDuracao,
  formatarDuracao,
  nomeColuna,
  permanenciaAtual,
  tempoPorColuna,
  type Movimentacao,
} from "@/lib/historico-cartao";

const H = 3_600_000;
const D = 24 * H;
const T0 = Date.parse("2026-09-01T12:00:00Z");

let seq = 0;
function ev(
  cartao: string,
  ms: number,
  destino: string | null,
  extra: Partial<Movimentacao> = {},
): Movimentacao {
  seq += 1;
  return {
    id: `e${seq}`,
    cartao_id: cartao,
    tipo: "movido",
    coluna_origem_id: null,
    coluna_origem_nome: null,
    coluna_destino_id: destino ? `id-${destino}` : null,
    coluna_destino_nome: destino,
    usuario_id: null,
    reconstruido: false,
    criado_em: new Date(T0 + ms).toISOString(),
    ...extra,
  };
}

describe("nomeColuna", () => {
  it("id e nome nulos e o backlog", () => {
    expect(nomeColuna(null, null)).toBe("Backlog");
  });
  it("prefere o nome copiado na hora, mesmo com a coluna ja excluida", () => {
    expect(nomeColuna(null, "Em Revisão")).toBe("Em Revisão");
  });
  it("coluna sem nome conhecido nao vira backlog", () => {
    expect(nomeColuna("id-x", null)).toBe("coluna removida");
  });
});

describe("permanenciaAtual", () => {
  it("usa o ultimo evento, mesmo fora de ordem", () => {
    const eventos = [ev("a", 2 * D, "Em Andamento"), ev("a", 0, "A Fazer", { tipo: "criado" })];
    const r = permanenciaAtual(eventos, T0 + 5 * D);
    expect(r?.coluna).toBe("Em Andamento");
    expect(r?.duracaoMs).toBe(3 * D);
  });
  it("sem eventos, sem resposta", () => {
    expect(permanenciaAtual([], T0)).toBeNull();
  });
});

describe("tempoPorColuna", () => {
  it("media so as passagens completas, agrupando pelo nome entre cartoes", () => {
    const eventos = [
      ev("a", 0, "A Fazer", { tipo: "criado" }),
      ev("a", 1 * D, "Em Andamento"),
      ev("a", 4 * D, "Concluído"),
      ev("b", 0, "A Fazer", { tipo: "criado" }),
      ev("b", 3 * D, "Em Andamento"),
      ev("b", 4 * D, "Concluído"),
    ];
    const r = Object.fromEntries(tempoPorColuna(eventos).map((t) => [t.coluna, t]));
    expect(r["A Fazer"]).toEqual({ coluna: "A Fazer", mediaMs: 2 * D, passagens: 2 });
    expect(r["Em Andamento"]).toEqual({ coluna: "Em Andamento", mediaMs: 2 * D, passagens: 2 });
    // Concluido e a coluna atual dos dois: tempo ainda correndo, nao entra.
    expect(r["Concluído"]).toBeUndefined();
  });

  it("nao conta o tempo no backlog", () => {
    const eventos = [
      ev("a", 0, null, { tipo: "criado" }),
      ev("a", 10 * D, "A Fazer"),
      ev("a", 11 * D, "Concluído"),
    ];
    const colunas = tempoPorColuna(eventos).map((t) => t.coluna);
    expect(colunas).toEqual(["A Fazer"]);
  });

  it("ordena da coluna mais lenta pra mais rapida", () => {
    const eventos = [
      ev("a", 0, "Rápida", { tipo: "criado" }),
      ev("a", 1 * H, "Lenta"),
      ev("a", 5 * D, "Fim"),
    ];
    expect(tempoPorColuna(eventos).map((t) => t.coluna)).toEqual(["Lenta", "Rápida"]);
  });

  it("criacao e movimento no mesmo instante: criado vem primeiro", () => {
    const eventos = [
      ev("a", 0, "Em Andamento"),
      ev("a", 0, "A Fazer", { tipo: "criado" }),
      ev("a", 2 * D, "Concluído"),
    ];
    const r = tempoPorColuna(eventos);
    expect(r.find((t) => t.coluna === "Em Andamento")?.mediaMs).toBe(2 * D);
  });
});

describe("extremosDeDuracao", () => {
  const cartao = (id: string, dias: number, concluido = true) => ({
    id,
    titulo: `Cartão ${id}`,
    criado_em: new Date(T0).toISOString(),
    data_conclusao: new Date(T0 + dias * D).toISOString(),
    concluido,
  });

  it("nomeia os mais rapidos e os mais lentos", () => {
    const r = extremosDeDuracao([1, 9, 3, 7, 5, 2].map((d) => cartao(`c${d}`, d)), 2);
    expect(r.rapidos.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(r.lentos.map((c) => c.id)).toEqual(["c9", "c7"]);
  });

  it("com poucos cartoes, as listas nao se repetem", () => {
    const r = extremosDeDuracao([cartao("a", 1), cartao("b", 2), cartao("c", 3), cartao("d", 4)], 3);
    const ids = [...r.rapidos, ...r.lentos].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.lentos.map((c) => c.id)).toEqual(["d"]);
  });

  it("ignora quem nao terminou", () => {
    const r = extremosDeDuracao([cartao("a", 1), cartao("b", 2, false)]);
    expect([...r.rapidos, ...r.lentos].map((c) => c.id)).toEqual(["a"]);
  });
});

describe("formatarDuracao", () => {
  it.each([
    [30 * 60_000, "30 min"],
    [5 * H, "5 h"],
    [D, "1 dia"],
    [2.34 * D, "2,3 dias"],
    [14.6 * D, "15 dias"],
    [-1, "—"],
  ])("%d ms -> %s", (ms, texto) => {
    expect(formatarDuracao(ms)).toBe(texto);
  });
});
