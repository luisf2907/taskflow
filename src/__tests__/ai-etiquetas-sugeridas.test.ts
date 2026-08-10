import { describe, expect, it } from "vitest";
import { CORES_ETIQUETA } from "@/lib/colors";
import { LIMITES } from "@/lib/ai/backlog-input";
import {
  chaveEtiqueta,
  escolherCores,
  idsDoCard,
  normalizarNomeEtiqueta,
  resolverEtiquetas,
  type EtiquetaExistente,
} from "@/lib/ai/etiquetas-sugeridas";

const EXISTENTES: EtiquetaExistente[] = [
  { id: "id-bug", nome: "Bug", cor: CORES_ETIQUETA[0] },
  { id: "id-back", nome: "Back-end", cor: CORES_ETIQUETA[1] },
];

describe("normalizarNomeEtiqueta", () => {
  it("colapsa espacos e corta no limite", () => {
    expect(normalizarNomeEtiqueta("  front   end  ")).toBe("front end");
    expect(normalizarNomeEtiqueta("x".repeat(50))).toHaveLength(
      LIMITES.NOME_ETIQUETA_MAX
    );
  });
});

describe("chaveEtiqueta", () => {
  it("iguala grafias que o modelo varia entre lotes", () => {
    const k = chaveEtiqueta("Back-end");
    expect(chaveEtiqueta("back end")).toBe(k);
    expect(chaveEtiqueta("BACKEND")).toBe(k);
  });

  it("ignora acento", () => {
    expect(chaveEtiqueta("Manutencao")).toBe(chaveEtiqueta("Manutenção"));
  });
});

describe("escolherCores", () => {
  it("evita cores ja usadas no workspace", () => {
    const emUso = [CORES_ETIQUETA[0], CORES_ETIQUETA[1]];
    const cores = escolherCores(3, emUso);
    expect(cores).toHaveLength(3);
    for (const c of cores) expect(emUso).not.toContain(c);
  });

  it("volta a repetir quando a paleta inteira esta em uso", () => {
    const cores = escolherCores(2, [...CORES_ETIQUETA]);
    expect(cores).toHaveLength(2);
    for (const c of cores) expect(CORES_ETIQUETA).toContain(c);
  });
});

describe("resolverEtiquetas", () => {
  it("casa com as existentes em vez de propor nova", () => {
    const r = resolverEtiquetas(["bug", "BACK END"], EXISTENTES);
    expect(r.novas).toEqual([]);
    expect(r.porChave.get(chaveEtiqueta("bug"))).toBe("id-bug");
    expect(r.porChave.get(chaveEtiqueta("back end"))).toBe("id-back");
  });

  it("propoe nova para o que nao casa, com cor da paleta", () => {
    const r = resolverEtiquetas(["infra"], EXISTENTES);
    expect(r.novas).toHaveLength(1);
    expect(r.novas[0].nome).toBe("infra");
    expect(CORES_ETIQUETA).toContain(r.novas[0].cor);
    expect(r.porChave.get(chaveEtiqueta("infra"))).toBe("novo:0");
  });

  it("nao duplica a mesma etiqueta vinda de lotes diferentes", () => {
    const r = resolverEtiquetas(["Infra", "infra", "INFRA "], EXISTENTES);
    expect(r.novas).toHaveLength(1);
  });

  it("respeita o teto de etiquetas novas e reporta as recusadas", () => {
    const nomes = Array.from({ length: LIMITES.ETIQUETAS_NOVAS_MAX + 3 }, (_, i) => `nova${i}`);
    const r = resolverEtiquetas(nomes, EXISTENTES);
    expect(r.novas).toHaveLength(LIMITES.ETIQUETAS_NOVAS_MAX);
    expect(r.recusadas).toHaveLength(3);
  });

  it("ignora nome vazio ou so pontuacao", () => {
    const r = resolverEtiquetas(["", "   ", "---"], EXISTENTES);
    expect(r.novas).toEqual([]);
  });
});

describe("idsDoCard", () => {
  it("resolve nomes para ids, sem repetir", () => {
    const r = resolverEtiquetas(["bug", "infra"], EXISTENTES);
    expect(idsDoCard(["bug", "Bug", "infra"], r)).toEqual(["id-bug", "novo:0"]);
  });

  it("descarta nome que a resolucao nao conhece", () => {
    const r = resolverEtiquetas(["bug"], EXISTENTES);
    expect(idsDoCard(["bug", "inexistente"], r)).toEqual(["id-bug"]);
  });

  it("aguenta valor que nao e array", () => {
    const r = resolverEtiquetas([], EXISTENTES);
    expect(idsDoCard(undefined, r)).toEqual([]);
    expect(idsDoCard("bug", r)).toEqual([]);
  });
});
