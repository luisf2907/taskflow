import { describe, expect, it } from "vitest";
import {
  LIMITES,
  detectarModo,
  emLotes,
  parseLista,
  pareceLista,
  planejar,
} from "@/lib/ai/backlog-input";

const LISTA = `- Corrigir login com Google
- Ajustar responsivo do header
- Subir limite de upload
- Trocar copy da landing`;

describe("pareceLista", () => {
  it("reconhece marcadores comuns", () => {
    expect(pareceLista(LISTA)).toBe(true);
    expect(pareceLista("1. um\n2. dois\n3. tres")).toBe(true);
    expect(pareceLista("* um\n* dois\n* tres")).toBe(true);
    expect(pareceLista("[ ] um\n[x] dois\n[ ] tres")).toBe(true);
  });

  it("nao confunde prosa quebrada em linhas com lista", () => {
    const prosa = `Preciso de um sistema de login
que aceite Google e email
com recuperacao de senha
e uma tela de perfil`;
    expect(pareceLista(prosa)).toBe(false);
  });

  it("exige pelo menos tres itens", () => {
    expect(pareceLista("- so um\n- e dois")).toBe(false);
  });

  it("ignora texto com poucos marcadores no meio de prosa", () => {
    const misto = `Preciso reformular o onboarding inteiro porque hoje ele
confunde quem chega. A tela inicial tem informacao demais e o usuario
abandona antes de criar o primeiro quadro. Vale revisar tambem o email
de boas vindas, que hoje chega sem contexto nenhum.
- um ponto solto
- outro ponto solto`;
    expect(pareceLista(misto)).toBe(false);
  });
});

describe("parseLista", () => {
  it("extrai itens sem o marcador", () => {
    expect(parseLista(LISTA).map((i) => i.texto)).toEqual([
      "Corrigir login com Google",
      "Ajustar responsivo do header",
      "Subir limite de upload",
      "Trocar copy da landing",
    ]);
  });

  it("trata linha indentada como subitem, nao como card novo", () => {
    const itens = parseLista(`- Refazer checkout
    - aceitar pix
    - aceitar boleto
- Ajustar emails`);
    expect(itens).toHaveLength(2);
    expect(itens[0].subitens).toEqual(["aceitar pix", "aceitar boleto"]);
    expect(itens[1].subitens).toEqual([]);
  });

  it("aceita numeracao e checkbox", () => {
    expect(parseLista("1. um\n2) dois\n[x] tres").map((i) => i.texto)).toEqual([
      "um",
      "dois",
      "tres",
    ]);
  });

  it("descarta marcador sem conteudo", () => {
    expect(parseLista("- \n- real\n-  \n- outro")).toHaveLength(2);
  });
});

describe("detectarModo", () => {
  it("respeita o modo forcado", () => {
    expect(detectarModo(LISTA, "requisito")).toBe("requisito");
    expect(detectarModo("prosa qualquer", "lista")).toBe("lista");
  });

  it("decide sozinho no auto", () => {
    expect(detectarModo(LISTA, "auto")).toBe("lista");
    expect(detectarModo("Preciso de um sistema de login.", "auto")).toBe("requisito");
  });
});

describe("emLotes", () => {
  it("quebra no tamanho pedido", () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("devolve um lote quando cabe tudo", () => {
    expect(emLotes([1, 2], 10)).toEqual([[1, 2]]);
  });

  it("nao explode com lista vazia", () => {
    expect(emLotes([], 10)).toEqual([]);
  });
});

describe("planejar", () => {
  it("no requisito nao produz itens nem lotes", () => {
    const p = planejar("Preciso de um sistema de login.", "auto");
    expect(p.modo).toBe("requisito");
    expect(p.lotes).toEqual([]);
    expect(p.tetoCards).toBe(LIMITES.CARDS_REQUISITO);
  });

  it("na lista quebra em lotes do tamanho configurado", () => {
    const texto = Array.from({ length: 25 }, (_, i) => `- tarefa ${i + 1}`).join("\n");
    const p = planejar(texto, "auto");
    expect(p.modo).toBe("lista");
    expect(p.itens).toHaveLength(25);
    expect(p.lotes).toHaveLength(Math.ceil(25 / LIMITES.ITENS_POR_LOTE));
    expect(p.ignorados).toBe(0);
  });

  it("conta os itens que passam do teto em vez de cortar calado", () => {
    const excedente = 7;
    const texto = Array.from(
      { length: LIMITES.CARDS_LISTA + excedente },
      (_, i) => `- tarefa ${i + 1}`
    ).join("\n");
    const p = planejar(texto, "auto");
    expect(p.itens).toHaveLength(LIMITES.CARDS_LISTA);
    expect(p.ignorados).toBe(excedente);
  });
});
