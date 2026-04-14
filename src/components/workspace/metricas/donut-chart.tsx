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
  const espessura = 28;
  const rInterno = r - espessura;
  const circunferencia = 2 * Math.PI * ((r + rInterno) / 2);

  // Uso reduce pra evitar mutação de variável externa durante o render
  // (flagged by react-hooks/immutability).
  const arcos = segmentos
    .filter((s) => s.valor > 0)
    .reduce<Array<(typeof segmentos)[number] & { pct: number; comprimento: number; offset: number }>>((acc, s) => {
      const pct = s.valor / total;
      const comprimento = pct * circunferencia;
      const offset = acc.length === 0 ? 0 : acc[acc.length - 1].offset + acc[acc.length - 1].comprimento;
      acc.push({ ...s, pct, comprimento, offset });
      return acc;
    }, []);

  return (
    <div className="flex items-center gap-6">
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
            strokeLinecap="round"
          />
        ))}
        <text
          x={centro}
          y={centro - 6}
          textAnchor="middle"
          fontSize={22}
          fontWeight={700}
          fill="var(--tf-text)"
        >
          {total}
        </text>
        <text
          x={centro}
          y={centro + 12}
          textAnchor="middle"
          fontSize={10}
          fill="var(--tf-text-tertiary)"
        >
          cards
        </text>
      </svg>
      <div className="space-y-1.5">
        {arcos.map((arco, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: arco.cor }}
            />
            <span
              className="text-[12px]"
              style={{ color: "var(--tf-text-secondary)" }}
            >
              {arco.label}
            </span>
            <span
              className="text-[12px] font-bold ml-auto"
              style={{ color: "var(--tf-text)" }}
            >
              {arco.valor}
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--tf-text-tertiary)" }}
            >
              ({Math.round(arco.pct * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
