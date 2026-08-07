import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
// Vem transitivo do eslint-config-next; importado so para ler o preset.
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // ───── Acessibilidade ─────
  // O eslint-config-next traz so um subconjunto do jsx-a11y. O conjunto
  // recomendado (34 regras) apontava 148 problemas; foram todos tratados, e
  // agora ele fica ligado para nao regredir.
  //
  // Espalhar `configs.recommended.rules` em vez de listar as regras a mao:
  // varias trazem OPCOES junto da severidade, e tres vem desligadas de
  // proposito (control-has-associated-label, label-has-for,
  // anchor-ambiguous-text). Uma lista manual perde isso e vira ruido —
  // ligar as tres como erro produzia 139 erros que o preset nao pede.
  //
  // O plugin ja esta registrado pelo eslint-config-next; o import aqui so le
  // o preset, nao declara plugin de novo (isso daria "Cannot redefine").
  //
  // UMA REGRA FICA DE FORA: no-autofocus. Ela proibe autoFocus, mas mover o
  // foco para o primeiro campo ao abrir um dialogo e o comportamento CERTO.
  // Sao 30 ocorrencias, quase todas em modal — "consertar" pioraria a vida
  // de quem usa teclado, que e justamente quem a regra deveria proteger.
  //
  // Onde ha eslint-disable pontual, a razao esta escrita ao lado. Cobrem
  // casos em que obedecer seria ERRADO: <div> de stopPropagation, backdrop
  // (equivalente e Esc, nao Tab), spread que o linter nao enxerga
  // ({...listeners} do dnd-kit, {...propsBarraDeAudio}), <audio> de gravacao
  // sem faixa .vtt, e o icone `Image` do lucide-react que a regra alt-text
  // confunde com <img> por causa do nome.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      ...jsxA11y.configs.recommended.rules,
      "jsx-a11y/no-autofocus": "off",
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
