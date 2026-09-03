import { describe, expect, it } from "vitest";

import {
  CHANGELOG,
  ENTRADA_ATUAL,
  VERSAO_ATUAL,
  contaAnteriorAoReleaseAtual,
  novidadesDesde,
  versaoConhecida,
} from "@/lib/changelog";

// Regras do modal de novidades. Sao funcoes puras, mas cada uma delas ja
// deixou passar um bug real: gente presa sem ver release nenhum, e a base
// inteira silenciada no primeiro lancamento. Testar aqui e mais barato que
// descobrir logando com sete contas diferentes.

describe("CHANGELOG", () => {
  it("esta ordenado da versao mais nova pra mais antiga", () => {
    // novidadesDesde faz slice(0, indice) contando com esta ordem. Inverter
    // uma entrada por engano faria o modal mostrar o passado como novidade.
    const datas = CHANGELOG.map((e) => e.data);
    expect([...datas].sort().reverse()).toEqual(datas);
  });

  it("nao tem versao repetida", () => {
    const versoes = CHANGELOG.map((e) => e.versao);
    expect(new Set(versoes).size).toBe(versoes.length);
  });

  it("expoe a primeira entrada como versao e release atual", () => {
    expect(VERSAO_ATUAL).toBe(CHANGELOG[0].versao);
    expect(ENTRADA_ATUAL).toBe(CHANGELOG[0]);
  });
});

describe("versaoConhecida", () => {
  it("aceita versao presente no array", () => {
    expect(versaoConhecida(VERSAO_ATUAL)).toBe(true);
  });

  it("recusa nulo e versao ausente", () => {
    expect(versaoConhecida(null)).toBe(false);
    expect(versaoConhecida("9.9.9-fantasma")).toBe(false);
  });
});

describe("novidadesDesde", () => {
  it("nao mostra nada pra quem ja esta na versao atual", () => {
    expect(novidadesDesde(VERSAO_ATUAL)).toEqual([]);
  });

  it("mostra todas as releases acumuladas, da mais nova pra mais antiga", () => {
    // Quem ficou varias versoes sem entrar recebe tudo de uma vez, e nao so
    // a ultima.
    const maisAntiga = CHANGELOG[CHANGELOG.length - 1].versao;
    const resultado = novidadesDesde(maisAntiga);
    expect(resultado).toHaveLength(CHANGELOG.length - 1);
    expect(resultado[0]).toBe(CHANGELOG[0]);
  });

  it("devolve vazio pra versao que sumiu do array", () => {
    // Entrada aparada ou rollback. Quem trata este caso e o useAvisos, que
    // carimba em silencio — se aqui devolvesse o historico inteiro, a pessoa
    // levaria uma retrospectiva que nunca pediu.
    expect(novidadesDesde("0.0.1-removida")).toEqual([]);
  });

  it("devolve vazio pra nulo", () => {
    expect(novidadesDesde(null)).toEqual([]);
  });
});

describe("contaAnteriorAoReleaseAtual", () => {
  it("reconhece quem ja usava o produto antes da release", () => {
    expect(contaAnteriorAoReleaseAtual("2020-01-01T00:00:00Z")).toBe(true);
  });

  it("nao trata cadastro posterior a release como usuario antigo", () => {
    expect(contaAnteriorAoReleaseAtual("2999-12-31T23:59:59Z")).toBe(false);
  });

  it("trata cadastro no mesmo dia da release como conta nova", () => {
    // Nao da pra saber se o cadastro veio antes ou depois do deploy. O
    // silencio e o lado seguro: mostrar "o que mudou" pra quem entrou hoje
    // nao significa nada.
    expect(contaAnteriorAoReleaseAtual(`${ENTRADA_ATUAL.data}T00:00:00Z`)).toBe(
      false,
    );
  });

  it("trata ausencia de data como conta nova", () => {
    expect(contaAnteriorAoReleaseAtual(null)).toBe(false);
  });

  it("compara por dia, ignorando hora e fuso", () => {
    const [ano, mes, dia] = ENTRADA_ATUAL.data.split("-").map(Number);
    const vespera = new Date(Date.UTC(ano, mes - 1, dia - 1))
      .toISOString()
      .slice(0, 10);
    expect(contaAnteriorAoReleaseAtual(`${vespera}T23:59:59Z`)).toBe(true);
  });
});
