"use client";

interface LineChartProps {
  dados: { label: string; valor: number }[];
  largura?: number;
  altura?: number;
}

export function LineChart({
  dados,
  largura = 500,
  altura = 200,
}: LineChartProps) {
  if (dados.length < 2) return null;

  const maxValor = Math.max(...dados.map((d) => d.valor), 1);
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const w = largura - padding.left - padding.right;
  const h = altura - padding.top - padding.bottom;

  const pontos = dados.map((d, i) => ({
    x: padding.left + (i / (dados.length - 1)) * w,
    y: padding.top + h - (d.valor / maxValor) * h,
    ...d,
  }));

  const linePath = pontos
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${pontos[pontos.length - 1].x} ${
    padding.top + h
  } L ${pontos[0].x} ${padding.top + h} Z`;

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padding.top + h - pct * h,
    label: Math.round(maxValor * pct).toString(),
  }));

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="w-full"
      style={{ maxHeight: altura }}
    >
      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={g.y}
            x2={largura - padding.right}
            y2={g.y}
            stroke="var(--tf-border)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
          <text
            x={padding.left - 8}
            y={g.y + 4}
            textAnchor="end"
            fontSize={10}
            fill="var(--tf-text-tertiary)"
          >
            {g.label}
          </text>
        </g>
      ))}

      {/* Area gradient */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tf-accent)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--tf-accent)" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="var(--tf-accent)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {pontos.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={4}
            fill="var(--tf-surface)"
            stroke="var(--tf-accent)"
            strokeWidth={2.5}
          />
          <text
            x={p.x}
            y={padding.top + h + 20}
            textAnchor="middle"
            fontSize={10}
            fill="var(--tf-text-tertiary)"
          >
            {p.label.length > 8 ? p.label.slice(0, 8) + "..." : p.label}
          </text>
          <text
            x={p.x}
            y={p.y - 10}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="var(--tf-text-secondary)"
          >
            {p.valor}
          </text>
        </g>
      ))}
    </svg>
  );
}
