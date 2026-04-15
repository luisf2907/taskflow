"use client";

interface DonutChartProps {
  segmentos: { label: string; valor: number; cor: string }[];
  tamanho?: number;
}

export function DonutChart({ segmentos, tamanho = 160 }: DonutChartProps) {
  const total = segmentos.reduce((acc, s) => acc + s.valor, 0);
  if (total === 0) return null;

  const r = (tamanho - 20) / 2;
  const centro = tamanho / 2;
  const espessura = 14;
  const rInterno = r - espessura;
  const circunferencia = 2 * Math.PI * ((r + rInterno) / 2);

  const arcos = segmentos
    .filter((s) => s.valor > 0)
    .reduce<
      Array<
        (typeof segmentos)[number] & {
          pct: number;
          comprimento: number;
          offset: number;
        }
      >
    >((acc, s) => {
      const pct = s.valor / total;
      const comprimento = pct * circunferencia;
      const offset =
        acc.length === 0
          ? 0
          : acc[acc.length - 1].offset + acc[acc.length - 1].comprimento;
      acc.push({ ...s, pct, comprimento, offset });
      return acc;
    }, []);

  return (
    <div className="flex items-center gap-5">
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>
        {arcos.map((arco, i) => (
          <circle
            key={i}
            cx={centro}
            cy={centro}
            r={(r + rInterno) / 2}
            fill="none"
            stroke={arco.cor}
            strokeWidth={espessura}
            strokeDasharray={`${arco.comprimento} ${
              circunferencia - arco.comprimento
            }`}
            strokeDashoffset={-arco.offset}
            transform={`rotate(-90 ${centro} ${centro})`}
            strokeLinecap="butt"
          />
        ))}
        <text
          x={centro}
          y={centro - 2}
          textAnchor="middle"
          fontSize={24}
          fontWeight={600}
          fill="var(--tf-text)"
          fontFamily="var(--tf-font-mono)"
          style={{ letterSpacing: "-0.02em" }}
        >
          {total}
        </text>
        <text
          x={centro}
          y={centro + 14}
          textAnchor="middle"
          fontSize={9}
          fill="var(--tf-text-tertiary)"
          fontFamily="var(--tf-font-mono)"
          style={{ letterSpacing: "0.1em" }}
        >
          CARDS
        </text>
      </svg>
      <div className="space-y-1 flex-1">
        {arcos.map((arco, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-2 h-2 shrink-0"
              style={{ background: arco.cor, borderRadius: "1px" }}
            />
            <span
              className="text-[0.75rem]"
              style={{
                color: "var(--tf-text-secondary)",
                letterSpacing: "-0.005em",
              }}
            >
              {arco.label}
            </span>
            <span
              className="text-[0.75rem] ml-auto"
              style={{
                color: "var(--tf-text)",
                fontFamily: "var(--tf-font-mono)",
                fontWeight: 500,
              }}
            >
              {arco.valor}
            </span>
            <span
              className="text-[0.625rem] min-w-[32px] text-right"
              style={{
                color: "var(--tf-text-tertiary)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              {Math.round(arco.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
