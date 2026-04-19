"use client";

/**
 * Ilustracoes para empty states — esteticas "tech-futurista sobria"
 * alinhadas ao design system:
 *  - monocromaticas (currentColor) com acento orange pontual
 *  - geometricas, grid-based, thin strokes 1-1.25px
 *  - sem ornamentos desnecessarios
 *
 * Uso:
 *   <IllustrationBoard />  <-- usa currentColor (var(--tf-text-tertiary) tipicamente)
 *   <IllustrationBoard size={160} />
 */

interface IllustrationProps {
  size?: number;
  className?: string;
}

const baseProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Kanban vazio: 3 colunas esquematicas, uma celula orange como "primeira tarefa". */
export function IllustrationBoard({ size = 140, className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      width={size}
      height={(size * 120) / 160}
      className={className}
      aria-hidden
    >
      {/* Frame */}
      <rect x="4" y="8" width="152" height="104" rx="6" strokeWidth="1.25" {...baseProps} />
      {/* Header line */}
      <line x1="4" y1="22" x2="156" y2="22" strokeWidth="1" opacity="0.5" {...baseProps} />
      {/* Dots no header */}
      <circle cx="12" cy="15" r="1.2" fill="currentColor" opacity="0.5" />
      <circle cx="18" cy="15" r="1.2" fill="currentColor" opacity="0.5" />
      <circle cx="24" cy="15" r="1.2" fill="currentColor" opacity="0.5" />

      {/* Coluna 1 — com 1 cartao em orange (call to action) */}
      <g strokeWidth="1" {...baseProps}>
        <rect x="14" y="32" width="40" height="6" rx="1" opacity="0.3" />
        <rect
          x="14"
          y="44"
          width="40"
          height="20"
          rx="2"
          stroke="var(--tf-accent)"
          strokeWidth="1.25"
          opacity="0.9"
        />
        {/* linha dentro do cartao orange */}
        <line
          x1="18"
          y1="50"
          x2="42"
          y2="50"
          stroke="var(--tf-accent)"
          strokeWidth="1"
          opacity="0.6"
        />
        <line
          x1="18"
          y1="54"
          x2="34"
          y2="54"
          stroke="var(--tf-accent)"
          strokeWidth="1"
          opacity="0.4"
        />
        {/* barra vertical orange */}
        <line
          x1="14"
          y1="44"
          x2="14"
          y2="64"
          stroke="var(--tf-accent)"
          strokeWidth="2"
        />
      </g>

      {/* Coluna 2 — vazia, so o header esboçado */}
      <g strokeWidth="1" {...baseProps}>
        <rect x="60" y="32" width="40" height="6" rx="1" opacity="0.3" />
        <rect
          x="60"
          y="44"
          width="40"
          height="16"
          rx="2"
          opacity="0.2"
          strokeDasharray="2 2"
        />
        <rect
          x="60"
          y="66"
          width="40"
          height="16"
          rx="2"
          opacity="0.2"
          strokeDasharray="2 2"
        />
      </g>

      {/* Coluna 3 — vazia */}
      <g strokeWidth="1" {...baseProps}>
        <rect x="106" y="32" width="40" height="6" rx="1" opacity="0.3" />
        <rect
          x="106"
          y="44"
          width="40"
          height="16"
          rx="2"
          opacity="0.2"
          strokeDasharray="2 2"
        />
      </g>

      {/* Grid lines sutil */}
      <g opacity="0.08" strokeWidth="0.5" {...baseProps}>
        <line x1="4" y1="95" x2="156" y2="95" />
        <line x1="4" y1="105" x2="156" y2="105" />
      </g>
    </svg>
  );
}

/** Lista vazia: linhas de texto esboçadas + cursor piscante orange. */
export function IllustrationList({ size = 140, className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      width={size}
      height={(size * 120) / 160}
      className={className}
      aria-hidden
    >
      {/* Frame */}
      <rect x="4" y="8" width="152" height="104" rx="6" strokeWidth="1.25" {...baseProps} />

      {/* 4 linhas esboçadas */}
      <g strokeWidth="1.25" {...baseProps}>
        {[28, 52, 76, 100].map((y, i) => (
          <g key={y} opacity={1 - i * 0.15}>
            <rect x="14" y={y - 6} width="8" height="8" rx="1" opacity="0.5" />
            <line x1="28" y1={y - 2} x2={110 - i * 10} y2={y - 2} opacity="0.6" strokeDasharray={i > 1 ? "3 3" : undefined} />
            <rect x={130} y={y - 5} width="16" height="6" rx="1" opacity={0.4 - i * 0.08} />
          </g>
        ))}
      </g>

      {/* Cursor piscante orange na ultima linha */}
      <line
        x1="90"
        y1="94"
        x2="90"
        y2="104"
        stroke="var(--tf-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <animate
          attributeName="opacity"
          values="1;1;0;0;1"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </line>
    </svg>
  );
}

/** Sem workspaces: pastas empilhadas, uma com acento orange. */
export function IllustrationWorkspace({ size = 140, className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      width={size}
      height={(size * 120) / 160}
      className={className}
      aria-hidden
    >
      {/* Pasta de fundo */}
      <g strokeWidth="1.25" {...baseProps} opacity="0.3">
        <path d="M28 40 L52 40 L58 34 L118 34 L124 40 L140 40 L140 90 L28 90 Z" />
      </g>

      {/* Pasta do meio */}
      <g strokeWidth="1.25" {...baseProps} opacity="0.55">
        <path d="M22 50 L46 50 L52 44 L112 44 L118 50 L134 50 L134 100 L22 100 Z" />
      </g>

      {/* Pasta da frente com acento orange */}
      <g strokeWidth="1.5" {...baseProps}>
        <path
          d="M16 62 L40 62 L46 56 L106 56 L112 62 L128 62 L128 108 L16 108 Z"
          stroke="currentColor"
        />
        {/* aba orange */}
        <line
          x1="46"
          y1="56"
          x2="106"
          y2="56"
          stroke="var(--tf-accent)"
          strokeWidth="2"
        />
        {/* dots simulando arquivos */}
        <circle cx="32" cy="82" r="2" fill="var(--tf-accent)" />
        <line x1="42" y1="82" x2="90" y2="82" strokeWidth="1" opacity="0.5" />
        <circle cx="32" cy="92" r="2" opacity="0.4" fill="currentColor" />
        <line x1="42" y1="92" x2="80" y2="92" strokeWidth="1" opacity="0.3" />
      </g>
    </svg>
  );
}

/** Wiki vazia: pagina com texto esboçado + marca de citacao orange. */
export function IllustrationWiki({ size = 140, className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      width={size}
      height={(size * 120) / 160}
      className={className}
      aria-hidden
    >
      {/* Pagina */}
      <rect
        x="32"
        y="8"
        width="96"
        height="104"
        rx="3"
        strokeWidth="1.25"
        {...baseProps}
      />

      {/* Titulo */}
      <rect x="40" y="18" width="40" height="6" rx="1" fill="currentColor" opacity="0.6" />

      {/* Quote bar orange */}
      <line
        x1="40"
        y1="34"
        x2="40"
        y2="52"
        stroke="var(--tf-accent)"
        strokeWidth="2"
      />

      {/* Linhas de texto (2 grupos) */}
      <g strokeWidth="1" {...baseProps} opacity="0.5">
        <line x1="46" y1="38" x2="108" y2="38" />
        <line x1="46" y1="44" x2="94" y2="44" />
        <line x1="46" y1="50" x2="100" y2="50" />
      </g>

      <g strokeWidth="1" {...baseProps} opacity="0.4" strokeDasharray="3 3">
        <line x1="40" y1="66" x2="120" y2="66" />
        <line x1="40" y1="74" x2="104" y2="74" />
        <line x1="40" y1="82" x2="112" y2="82" />
        <line x1="40" y1="90" x2="88" y2="90" />
      </g>

      {/* Cursor piscante */}
      <rect x="90" y="86" width="1.5" height="8" fill="var(--tf-accent)">
        <animate
          attributeName="opacity"
          values="1;1;0;0;1"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </rect>
    </svg>
  );
}

/** Sem resultados de busca: lupa sobre um grid esparso. */
export function IllustrationSearch({ size = 140, className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      width={size}
      height={(size * 120) / 160}
      className={className}
      aria-hidden
    >
      {/* Grid esparso de fundo */}
      <g strokeWidth="1" {...baseProps} opacity="0.15">
        {[20, 40, 60, 80, 100, 120, 140].map((x) =>
          [20, 40, 60, 80, 100].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" />
          ))
        )}
      </g>

      {/* Lupa */}
      <g {...baseProps} strokeWidth="1.75">
        <circle cx="70" cy="58" r="28" />
        <line x1="92" y1="80" x2="112" y2="100" />
      </g>

      {/* Ponto de interrogacao orange dentro */}
      <text
        x="70"
        y="66"
        textAnchor="middle"
        fill="var(--tf-accent)"
        fontSize="22"
        fontFamily="var(--tf-font-mono)"
        fontWeight="600"
      >
        ?
      </text>
    </svg>
  );
}

/** Sem notificacoes: sino + grid de "silence". */
export function IllustrationInbox({ size = 140, className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      width={size}
      height={(size * 120) / 160}
      className={className}
      aria-hidden
    >
      {/* Sino */}
      <g {...baseProps} strokeWidth="1.5">
        <path d="M80 30 C68 30 62 40 62 54 L62 70 L56 78 L104 78 L98 70 L98 54 C98 40 92 30 80 30 Z" />
        <path d="M76 84 C76 88 78 90 80 90 C82 90 84 88 84 84" />
        <circle cx="80" cy="26" r="2" fill="currentColor" />
      </g>

      {/* Linhas "silenciadas" */}
      <g strokeWidth="1" {...baseProps} opacity="0.35" strokeDasharray="2 3">
        <line x1="20" y1="58" x2="52" y2="58" />
        <line x1="108" y1="58" x2="140" y2="58" />
        <line x1="20" y1="48" x2="42" y2="48" />
        <line x1="118" y1="48" x2="140" y2="48" />
      </g>

      {/* Check orange (tudo resolvido) */}
      <path
        d="M72 98 L78 104 L90 92"
        stroke="var(--tf-accent)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type IllustrationName =
  | "board"
  | "list"
  | "workspace"
  | "wiki"
  | "search"
  | "inbox";

const MAP: Record<IllustrationName, (p: IllustrationProps) => React.ReactElement> = {
  board: IllustrationBoard,
  list: IllustrationList,
  workspace: IllustrationWorkspace,
  wiki: IllustrationWiki,
  search: IllustrationSearch,
  inbox: IllustrationInbox,
};

export function Illustration({
  name,
  size,
  className,
}: IllustrationProps & { name: IllustrationName }) {
  const Comp = MAP[name];
  return <Comp size={size} className={className} />;
}
