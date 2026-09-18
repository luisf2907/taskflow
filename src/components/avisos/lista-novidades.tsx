import {
  ROTULO_TIPO,
  type EntradaChangelog,
  type TipoItemChangelog,
} from "@/lib/changelog";

/**
 * Entradas do changelog renderizadas.
 *
 * Usado em dois lugares que precisam ler igual: o modal de novidades do
 * primeiro login e a pagina /novidades, onde o historico fica disponivel a
 * qualquer momento. Um componente so evita que os dois divirjam na primeira
 * vez que alguem mexer no visual de um deles.
 */

// Cores por tipo de item. Tokens semanticos do tema em vez de valores fixos,
// senao o modo escuro fica com etiqueta brilhando.
const COR_TIPO: Record<TipoItemChangelog, { fg: string; bg: string }> = {
  // --tf-accent-text, e nao --tf-accent: o laranja puro sobre o fundo claro
  // do accent nao tem contraste suficiente. O par light/text existe no tema
  // justamente pra isso e ja vira nos dois modos.
  novo: { fg: "var(--tf-accent-text)", bg: "var(--tf-accent-light)" },
  melhoria: { fg: "var(--tf-text-secondary)", bg: "var(--tf-bg-secondary)" },
  correcao: { fg: "var(--tf-text-tertiary)", bg: "var(--tf-bg-secondary)" },
};

export function ListaNovidades({
  entradas,
  versaoAtual,
}: {
  entradas: EntradaChangelog[];
  /** Quando informada, a entrada desta versao ganha o selo "atual". */
  versaoAtual?: string;
}) {
  return (
    <div className="space-y-7">
      {entradas.map((entrada) => (
        <section key={entrada.versao} aria-labelledby={`versao-${entrada.versao}`}>
          <h3
            id={`versao-${entrada.versao}`}
            className="text-[0.9375rem] font-bold mb-1"
            style={{ color: "var(--tf-text)", letterSpacing: "-0.01em" }}
          >
            {entrada.titulo}
          </h3>
          <p
            className="label-mono mb-3 flex items-center gap-2"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <span>
              Versão {entrada.versao} · {formatarData(entrada.data)}
            </span>
            {versaoAtual === entrada.versao && (
              <span
                className="px-1.5 py-0.5"
                style={{
                  color: "var(--tf-accent-text)",
                  background: "var(--tf-accent-light)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
              >
                atual
              </span>
            )}
          </p>

          <ul className="space-y-2.5">
            {entrada.itens.map((item, j) => (
              <li key={j} className="flex items-start gap-2.5">
                <span
                  className="shrink-0 mt-px px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase"
                  style={{
                    color: COR_TIPO[item.tipo].fg,
                    background: COR_TIPO[item.tipo].bg,
                    borderRadius: "var(--tf-radius-xs)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {ROTULO_TIPO[item.tipo]}
                </span>
                <span
                  className="text-[0.8125rem] leading-relaxed"
                  style={{ color: "var(--tf-text-secondary)" }}
                >
                  {item.texto}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** "2026-09-02" -> "2 de set. de 2026". Sem Date() pra nao pegar fuso. */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  if (!ano || !mes || !dia) return iso;
  const meses = [
    "jan.", "fev.", "mar.", "abr.", "mai.", "jun.",
    "jul.", "ago.", "set.", "out.", "nov.", "dez.",
  ];
  return `${dia} de ${meses[mes - 1]} de ${ano}`;
}
