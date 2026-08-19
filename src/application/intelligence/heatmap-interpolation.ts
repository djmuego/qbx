import type { HeatmapPoint } from '../../domain/map/spatial-intelligence.types';

export interface HeatmapGridCell {
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  value: number;
  measured: boolean;
}

const EPS = 1e-6;

/** Inverse-distance weighting. Advisory overlay only — not a physical field model. */
export function interpolateHeatmapGrid(input: {
  points: HeatmapPoint[];
  lengthM: number;
  widthM: number;
  stepM?: number;
}): HeatmapGridCell[] {
  const { points, lengthM, widthM } = input;
  if (points.length === 0) return [];

  const stepM = input.stepM ?? Math.max(0.2, Math.min(lengthM, widthM) / 16);
  const cells: HeatmapGridCell[] = [];

  for (let y = stepM / 2; y < widthM; y += stepM) {
    for (let x = stepM / 2; x < lengthM; x += stepM) {
      let weightSum = 0;
      let valueSum = 0;
      let exact: HeatmapPoint | null = null;

      for (const p of points) {
        const d = Math.hypot(p.xM - x, p.yM - y);
        if (d < EPS) {
          exact = p;
          break;
        }
        const w = 1 / (d * d);
        weightSum += w;
        valueSum += w * p.value;
      }

      const value = exact ? exact.value : weightSum > 0 ? valueSum / weightSum : NaN;
      if (!Number.isFinite(value)) continue;

      cells.push({
        xM: x - stepM / 2,
        yM: y - stepM / 2,
        widthM: stepM,
        heightM: stepM,
        value,
        measured: Boolean(exact),
      });
    }
  }

  return cells;
}

export function heatmapValueRange(points: HeatmapPoint[]): { min: number; max: number } {
  if (points.length === 0) return { min: 0, max: 1 };
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (Math.abs(max - min) < 0.05) {
    return { min: min - 0.5, max: max + 0.5 };
  }
  return { min, max };
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

/** Simple diverging scale for temperature; sequential for humidity. */
export function heatmapCellColor(
  metric: 'temperature' | 'humidity',
  value: number,
  min: number,
  max: number,
): string {
  const t = clamp01((value - min) / (max - min || 1));

  if (metric === 'humidity') {
    const r = Math.round(219 - t * 140);
    const g = Math.round(234 - t * 80);
    const b = Math.round(254 - t * 30);
    return `rgb(${r},${g},${b})`;
  }

  // cool → warm
  const stops = [
    { t: 0, r: 59, g: 130, b: 246 },
    { t: 0.5, r: 34, g: 197, b: 94 },
    { t: 1, r: 239, g: 68, b: 68 },
  ];
  const seg = t <= 0.5 ? [stops[0]!, stops[1]!] : [stops[1]!, stops[2]!];
  const local = t <= 0.5 ? t * 2 : (t - 0.5) * 2;
  const r = Math.round(seg[0].r + (seg[1].r - seg[0].r) * local);
  const g = Math.round(seg[0].g + (seg[1].g - seg[0].g) * local);
  const b = Math.round(seg[0].b + (seg[1].b - seg[0].b) * local);
  return `rgb(${r},${g},${b})`;
}

export function formatHeatmapValue(metric: 'temperature' | 'humidity', value: number): string {
  if (metric === 'temperature') return `${value.toFixed(1)}°C`;
  return `${value.toFixed(0)}%`;
}
