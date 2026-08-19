import type { GrowContext } from '../../domain/ai/grow-context.types';

import type { TelemetryWindowSummary } from '../../domain/ai/grow-context.types';

const WINDOW_POINTS: Record<TelemetryWindowSummary['window'], number> = {
  '15m': 15,
  '1h': 60,
  '6h': 360,
  '24h': 1440,
  '7d': 2880,
};

function computeTrend(values: number[]): 'rising' | 'falling' | 'stable' | 'unknown' {
  if (values.length < 2) return 'unknown';
  const first = values[0]!;
  const last = values[values.length - 1]!;
  const delta = last - first;
  if (Math.abs(delta) < 0.05) return 'stable';
  return delta > 0 ? 'rising' : 'falling';
}

export function summarizeSensorHistory(
  sensorId: string,
  sensorType: string,
  points: { value: number }[],
  current: number | null,
  optimalMin?: number,
  optimalMax?: number,
) {
  const windows = (Object.keys(WINDOW_POINTS) as TelemetryWindowSummary['window'][]).map((window) => {
    const count = WINDOW_POINTS[window]!;
    const slice = points.slice(-Math.min(count, points.length));
    const values = slice.map((p) => p.value).filter((v) => Number.isFinite(v));

    if (values.length === 0) {
      return {
        window,
        sampleCount: 0,
        current,
        min: null,
        max: null,
        avg: null,
        trend: 'unknown' as const,
        rateOfChange: null,
        timeOutsideTargetMinutes: null,
        dataKind: 'UNKNOWN' as const,
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const trend = computeTrend(values);
    const rateOfChange = values.length >= 2 ? values[values.length - 1]! - values[0]! : null;

    let outside = 0;
    if (optimalMin != null && optimalMax != null) {
      outside = values.filter((v) => v < optimalMin || v > optimalMax).length;
    }

    return {
      window,
      sampleCount: values.length,
      current,
      min,
      max,
      avg: Number(avg.toFixed(2)),
      trend,
      rateOfChange: rateOfChange != null ? Number(rateOfChange.toFixed(2)) : null,
      timeOutsideTargetMinutes: optimalMin != null ? outside : null,
      dataKind: 'DERIVED' as const,
    };
  });

  return { sensorId, sensorType, windows };
}

export function formatGrowContextForPrompt(context: GrowContext): string {
  return JSON.stringify(context, null, 2);
}
