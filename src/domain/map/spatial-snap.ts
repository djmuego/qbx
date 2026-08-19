export const SNAP_STEPS_M = {
  off: 0,
  cm10: 0.1,
  cm25: 0.25,
  cm50: 0.5,
} as const;

export function snapValue(valueM: number, stepM: number): number {
  if (!Number.isFinite(valueM)) return 0;
  if (!stepM || stepM <= 0) return valueM;
  return Number((Math.round(valueM / stepM) * stepM).toFixed(4));
}

export function snapStepLabel(stepM: number): string {
  if (stepM <= 0) return 'OFF';
  if (stepM === 0.1) return '10 cm';
  if (stepM === 0.25) return '25 cm';
  if (stepM === 0.5) return '50 cm';
  return `${Math.round(stepM * 100)} cm`;
}
