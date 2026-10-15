export function Sparkline({
  points,
  level,
  width = 160,
  height = 44,
  className = "",
  stroke = "var(--color-pink)",
}: {
  points: number[];
  /** Optional horizontal guide line (the call's level). */
  level?: number | null;
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
}) {
  if (!points || points.length < 2) {
    return <div className={`h-[44px] bg-card ${className}`} style={{ width, height }} aria-hidden />;
  }
  const all = level != null ? [...points, level] : points;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const first = points[0];
  const up = last >= first;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="Recent price">
      {level != null && (
        <line x1={pad} x2={width - pad} y1={y(level)} y2={y(level)} stroke="var(--color-fg2)" strokeDasharray="3 3" strokeWidth="1" />
      )}
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="square" opacity={0.9} />
      <rect x={x(points.length - 1) - 2.5} y={y(last) - 2.5} width="5" height="5" fill={up ? "var(--color-pink)" : "var(--color-fire)"} />
    </svg>
  );
}
