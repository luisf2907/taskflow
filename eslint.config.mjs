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
  //   label-has-associated-control  (45 ocorrencias corrigidas)
  //
  // Ainda abertas, a ligar quando chegarem a zero:
  //   click-events-have-key-events (33), no-static-element-interactions (31),
  //   no-noninteractive-element-interactions (3), media-has-caption (3),
  //   alt-text (1), interactive-supports-focus (1),
  //   no-noninteractive-tabindex (1)
  //
  // no-autofocus fica FORA de proposito. Ela proibe autoFocus, mas mover o
  // foco para o primeiro campo ao abrir um dialogo e o comportamento certo
  // — sao 30 ocorrencias, quase todas em modal, e "consertar" pioraria.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "jsx-a11y/label-has-associated-control": "error",
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
