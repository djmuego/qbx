import React, { useMemo } from 'react';

export interface TelemetryChartPoint {
  timestampMs: number;
  value: number;
}

export interface TelemetryChartSeries {
  id: string;
  label: string;
  color: string;
  points: TelemetryChartPoint[];
  unit?: string;
}

interface GrowRunTelemetryChartProps {
  series: TelemetryChartSeries[];
  height?: number;
}

function buildPath(points: TelemetryChartPoint[], width: number, height: number, min: number, max: number): string {
  if (points.length === 0) return '';
  const range = max - min || 1;
  return points
    .map((p, i) => {
      const x = points.length === 1 ? width / 2 : (i / (points.length - 1)) * width;
      const y = height - ((p.value - min) / range) * (height - 8) - 4;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const GrowRunTelemetryChart: React.FC<GrowRunTelemetryChartProps> = ({ series, height = 120 }) => {
  const width = 320;

  const { min, max, paths } = useMemo(() => {
    const values = series.flatMap((s) => s.points.map((p) => p.value));
    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 1;
    const pad = (maxV - minV) * 0.1 || 1;
    const min = minV - pad;
    const max = maxV + pad;
    const paths = series.map((s) => ({
      id: s.id,
      label: s.label,
      color: s.color,
      d: buildPath(s.points, width, height, min, max),
    }));
    return { min, max, paths };
  }, [series, height]);

  if (series.every((s) => s.points.length === 0)) {
    return <p className="text-[11px] text-slate-500">—</p>;
  }

  void min;
  void max;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
        {paths.map((p) => (
          <path key={p.id} d={p.d} fill="none" stroke={p.color} strokeWidth="2" strokeLinecap="round" />
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
        {series.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
            {s.unit ? ` (${s.unit})` : ''}
          </span>
        ))}
      </div>
    </div>
  );
};
