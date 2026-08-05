import { describe, it, expect, vi, beforeEach } from "vitest";
import { chaveCartoes, chaveColunas, chaveQuadro } from "@/lib/board-keys";

// ─────────────────────────────────────────────────────────────────────────
// Guarda as duas decisoes de desenho do item 7 que nao se defendem sozinhas:
//
//   1. O CONTRATO DAS CHAVES. O fallback do servidor tem que casar com as
//      chaves que os hooks leem. Se nao casar, nada quebra — o board so
//      volta a pintar depois de hidratar, e a LCP silenciosamente regride
//      de ~1,1s pros 2,9s. Nenhum outro teste pegaria isso.
//
//   2. A REGRA BEST-EFFORT. Falha na leitura server-side nao pode injetar
//      um estado vazio, senao o SWR trata como resposta valida e o usuario
//      ve um board vazio de verdade. Tem que nao injetar nada e deixar o
//      client buscar como sempre fez.
// ─────────────────────────────────────────────────────────────────────────

const carregarBoardServidor = vi.fn();
vi.mock("@/lib/board-loader-server", () => ({ carregarBoardServidor }));

// O corpo do board arrasta a arvore de client components inteira; aqui so
// interessa COMO ele e embrulhado.
vi.mock("@/app/quadro/[id]/board-client", () => ({
  BoardClient: () => null,
}));

const { default: PaginaQuadro } = await import("@/app/quadro/[id]/page");

const QUADRO_ID = "f3778e64-0aae-4f2b-9f8a-4aedea3ffdfe";

const DADOS = {
  quadro: { id: QUADRO_ID, nome: "Exacta", workspace_id: "ws1" },
  colunas: [{ id: "c1", nome: "A fazer" }],
  cartoes: [{ id: "k1", titulo: "Medir baselines" }],
};

async function renderizar() {
  return PaginaQuadro({ params: Promise.resolve({ id: QUADRO_ID }) });
}

beforeEach(() => {
  carregarBoardServidor.mockReset();
});

describe("chaves do board", () => {
  // Fixa as strings literais de proposito. Sem isto, os testes abaixo
  // seriam auto-referenciais: a pagina e o teste usariam a mesma funcao, e
  // um rename passaria batido nos dois. Estes valores sao o formato que os
  // hooks usavam antes da centralizacao — mudar exige mudar aqui tambem,
  // que e o ponto.
  it("tem o formato que os hooks do board sempre usaram", () => {
    expect(chaveQuadro("X")).toBe("quadro-X");
    expect(chaveColunas("X")).toBe("colunas-X");
    expect(chaveCartoes("X")).toBe("cartoes-X");
  });
});

describe("PaginaQuadro — contrato do fallback", () => {
  it("injeta os dados nas MESMAS chaves que os hooks leem", async () => {
    carregarBoardServidor.mockResolvedValue(DADOS);
    const el = await renderizar();

    const fallback = el.props.value.fallback;

    expect(fallback[chaveQuadro(QUADRO_ID)]).toEqual(DADOS.quadro);
    expect(fallback[chaveColunas(QUADRO_ID)]).toEqual(DADOS.colunas);
    expect(fallback[chaveCartoes(QUADRO_ID)]).toEqual(DADOS.cartoes);
  });

  it("nao injeta chave alguma alem das tres do board", async () => {
    carregarBoardServidor.mockResolvedValue(DADOS);
    const el = await renderizar();

    expect(Object.keys(el.props.value.fallback).sort()).toEqual(
      [
        chaveQuadro(QUADRO_ID),
        chaveColunas(QUADRO_ID),
        chaveCartoes(QUADRO_ID),
      ].sort(),
    );
  });

  it("busca pelo id que veio dos params (que sao Promise no Next 16)", async () => {
    carregarBoardServidor.mockResolvedValue(DADOS);
    await renderizar();
    expect(carregarBoardServidor).toHaveBeenCalledWith(QUADRO_ID);
  });
});

describe("PaginaQuadro — best-effort", () => {
  it("sem dados do servidor, nao embrulha em SWRConfig nenhum", async () => {
    carregarBoardServidor.mockResolvedValue(null);
    const el = await renderizar();

    // Sem `value.fallback`: o client busca como antes desta mudanca.
    expect(el.props.value).toBeUndefined();
    expect(el.props.quadroId).toBe(QUADRO_ID);
  });

  it("o piso nunca e um board vazio injetado como resposta valida", async () => {
    carregarBoardServidor.mockResolvedValue(null);
    const el = await renderizar();

    expect(el.props.value?.fallback).toBeUndefined();
  });
});
