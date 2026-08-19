import type { TargetRange } from '../grow/grow-targets.types';

export type VpdClassification = 'low' | 'optimal' | 'high' | 'unknown';

export interface VpdCalculationInput {
  airTempC: number | null;
  relativeHumidityPercent: number | null;
  /** Future: leaf temperature offset for canopy VPD */
  leafTempOffsetC?: number;
}

export interface VpdResult {
  valueKpa: number | null;
  airTempC: number | null;
  relativeHumidityPercent: number | null;
  leafTempC: number | null;
  classification: VpdClassification;
  targetMinKpa?: number;
  targetMaxKpa?: number;
  label: string;
  detail: string;
  available: boolean;
}

/** Saturation vapor pressure (kPa) — Magnus approximation */
export function saturationVaporPressureKpa(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

export function calculateVpdKpa(airTempC: number, relativeHumidityPercent: number, leafTempOffsetC = 0): number {
  const leafTemp = airTempC + leafTempOffsetC;
  const svpLeaf = saturationVaporPressureKpa(leafTemp);
  const svpAir = saturationVaporPressureKpa(airTempC);
  const actualVaporPressure = svpAir * (relativeHumidityPercent / 100);
  return Math.max(0, svpLeaf - actualVaporPressure);
}

export function classifyVpd(valueKpa: number, target?: TargetRange): VpdClassification {
  if (!Number.isFinite(valueKpa)) return 'unknown';
  const min = target?.min ?? 0.4;
  const max = target?.max ?? 1.6;
  if (valueKpa < min - 0.1) return 'low';
  if (valueKpa > max + 0.15) return 'high';
  return 'optimal';
}

const CLASSIFICATION_LABEL: Record<VpdClassification, string> = {
  low: 'низкий',
  optimal: 'оптимальный',
  high: 'высокий',
  unknown: 'неизвестно',
};

export function analyzeVpd(input: VpdCalculationInput, target?: TargetRange): VpdResult {
  const { airTempC, relativeHumidityPercent, leafTempOffsetC = 0 } = input;

  if (!Number.isFinite(airTempC) || !Number.isFinite(relativeHumidityPercent)) {
    return {
      valueKpa: null,
      airTempC,
      relativeHumidityPercent,
      leafTempC: null,
      classification: 'unknown',
      targetMinKpa: target?.min,
      targetMaxKpa: target?.max,
      label: 'VPD недоступен',
      detail: 'Нужны live temp + RH для расчёта VPD.',
      available: false,
    };
  }

  const valueKpa = Number(calculateVpdKpa(airTempC!, relativeHumidityPercent!, leafTempOffsetC).toFixed(2));
  const classification = classifyVpd(valueKpa, target);

  let detail = `VPD ${valueKpa} kPa — ${CLASSIFICATION_LABEL[classification]}`;
  if (target?.min != null && target.max != null) {
    detail += ` (цель ${target.min}–${target.max} kPa)`;
  }

  return {
    valueKpa,
    airTempC,
    relativeHumidityPercent,
    leafTempC: Number((airTempC! + leafTempOffsetC).toFixed(1)),
    classification,
    targetMinKpa: target?.min,
    targetMaxKpa: target?.max,
    label: `VPD: ${valueKpa} kPa`,
    detail,
    available: true,
  };
}
