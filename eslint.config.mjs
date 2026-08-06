import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // ───── Acessibilidade ─────
  // O eslint-config-next ja traz um subconjunto do jsx-a11y (alt-text,
  // aria-props, role-*). O plugin completo tem muito mais, mas ligar tudo
  // de uma vez produziria ~100 avisos — e parede de aviso e aviso ignorado.
  //
  // A estrategia e travar como ERRO cada regra ja zerada, uma por vez,
  // conforme forem corrigidas. Assim o que foi consertado nao volta.
  //
  // Zeradas ate agora:
  //   label-has-associated-control    45 corrigidas
  //   click-events-have-key-events     33 -> 0
  //   no-static-element-interactions   31 -> 0
  //
  // Ainda abertas, a ligar quando chegarem a zero:
  //   media-has-caption (3), no-noninteractive-element-interactions (1),
  //   no-noninteractive-tabindex (1), interactive-supports-focus (1),
  //   alt-text (1)
  //
  // no-autofocus fica FORA de proposito. Ela proibe autoFocus, mas mover o
  // foco para o primeiro campo ao abrir um dialogo e o comportamento certo
  // — sao 30 ocorrencias, quase todas em modal, e "consertar" pioraria.
  //
  // As duas regras de teclado chegaram a zero com alguns eslint-disable
  // pontuais, cada um com a razao escrita ao lado. Nao sao atalho: cobrem
  // tres casos em que transformar o elemento em controle SERIA ERRADO —
  // <div> de stopPropagation, backdrop (cujo equivalente e Esc) e spread
  // que o linter nao enxerga ({...listeners} do dnd-kit,
  // {...propsBarraDeAudio}). Ligar as regras como erro protege justamente
  // os casos que nao tem excecao registrada.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-static-element-interactions": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
