import { describe, it, expect } from "vitest";
import { avatarDimensionado } from "@/lib/avatar-url";

const GITHUB = "https://avatars.githubusercontent.com/u/15044460?v=4";
const SUPABASE =
  "https://paxd.supabase.co/storage/v1/object/public/avatares/u1.png";

describe("avatarDimensionado", () => {
  it("pede 2x o tamanho de exibicao, pra nao borrar em retina", () => {
    expect(avatarDimensionado(GITHUB, 24)).toContain("s=48");
  });

  it("preserva os parametros que ja existiam na URL", () => {
    expect(avatarDimensionado(GITHUB, 24)).toContain("v=4");
  });

  it("deixa avatar que nao e do GitHub intacto", () => {
    // Upload proprio no Storage: nao ha parametro equivalente, e mexer na
    // URL pode quebrar assinatura.
    expect(avatarDimensionado(SUPABASE, 24)).toBe(SUPABASE);
  });

  it("devolve undefined sem avatar, pra casar com o src opcional do <img>", () => {
    expect(avatarDimensionado(null, 24)).toBeUndefined();
    expect(avatarDimensionado(undefined, 24)).toBeUndefined();
    expect(avatarDimensionado("", 24)).toBeUndefined();
  });

  it("serve a original quando a URL e malformada, em vez de quebrar", () => {
    expect(avatarDimensionado("nao-e-url", 24)).toBe("nao-e-url");
  });

  it("sobrescreve um s= preexistente em vez de duplicar", () => {
    const comS = `${GITHUB}&s=400`;
    const r = avatarDimensionado(comS, 24)!;
    expect(r).toContain("s=48");
    expect(r).not.toContain("s=400");
  });
});
