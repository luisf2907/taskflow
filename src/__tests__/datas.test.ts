import { describe, it, expect } from "vitest";
import { diasRestantes } from "@/lib/datas";

// ═══════════════════════════════════════════════════════════════════════
// diasRestantes — pura de proposito
// ═══════════════════════════════════════════════════════════════════════
// Antes a funcao chamava `new Date()` por dentro. O quadro e renderizado no
// servidor, entao o valor era calculado duas vezes com relogios diferentes:
// se a virada do Math.ceil caisse entre o render do servidor e a
// hidratacao, o texto divergia e o React descartava a arvore inteira.
//
// Com o instante vindo por parametro, o servidor congela o "agora" e manda
// junto com o HTML. Estes testes existem para que ninguem devolva a leitura
// de relogio para dentro da funcao.
// ═══════════════════════════════════════════════════════════════════════

const AGORA = Date.UTC(2026, 7, 7, 12, 0, 0); // 07/ago/2026 12:00 UTC

describe("diasRestantes", () => {
  it("depende só dos argumentos, não do relógio", () => {
    const primeira = diasRestantes("2026-08-20", AGORA);
    // A mesma chamada, mais tarde no tempo real, tem que dar o mesmo numero.
    const segunda = diasRestantes("2026-08-20", AGORA);
    expect(segunda).toBe(primeira);
    expect(primeira).toBe(13);
  });

  it("conta para frente e para trás", () => {
    expect(diasRestantes("2026-08-08", AGORA)).toBe(1);
    // Math.ceil de fracao negativa devolve -0, que o vitest trata como
    // diferente de 0 (Object.is). Para o app tanto faz: -0 === 0 e ambos
    // renderizam "0".
    expect(diasRestantes("2026-08-07", AGORA)).toBeCloseTo(0);
    expect(diasRestantes("2026-08-05", AGORA)).toBe(-2);
  });

  it("devolve null sem data", () => {
    expect(diasRestantes(null, AGORA)).toBeNull();
  });

  it("um milissegundo separa dois resultados diferentes", () => {
    // Esta e a fresta que derrubava a hidratacao: o servidor renderiza um
    // instante antes da virada, o cliente hidrata um instante depois, e o
    // texto muda de "1d" para "HOJE!". Improvavel, mas real — e o motivo
    // de o "agora" precisar ser o MESMO nos dois renders.
    const alvo = Date.UTC(2026, 7, 20);

    expect(diasRestantes("2026-08-20", alvo - 1)).toBe(1);
    expect(diasRestantes("2026-08-20", alvo)).toBe(0);

    // Congelado no servidor, os dois renders caem do mesmo lado da fresta.
    const congelado = alvo - 1;
    expect(diasRestantes("2026-08-20", congelado)).toBe(
      diasRestantes("2026-08-20", congelado),
    );
  });
});
