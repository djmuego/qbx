import type { DerivedMetric } from '../../domain/ai/grow-context.types';
import { analyzeVpd } from '../../domain/agronomy/vpd';
import type { TargetRange } from '../../domain/grow/grow-targets.types';

/** Saturation vapor pressure (kPa) — Magnus approximation */
function saturationVaporPressureKpa(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

export function calculateVpd(
  tempC: number | null,
  rhPercent: number | null,
  vpdTarget?: TargetRange,
): DerivedMetric {
  const inputs: string[] = [];
  if (tempC != null) inputs.push('temperature');
  if (rhPercent != null) inputs.push('humidity');

  const vpdResult = analyzeVpd({ airTempC: tempC, relativeHumidityPercent: rhPercent }, vpdTarget);

  if (!vpdResult.available) {
    return {
      id: 'vpd',
      label: 'VPD',
      value: null,
      unit: 'kPa',
      available: false,
      quality: 'missing',
      dataKind: 'DERIVED',
      inputs,
    };
  }

  return {
    id: 'vpd',
    label: vpdResult.label,
    value: vpdResult.valueKpa,
    unit: 'kPa',
    available: true,
    quality: 'fresh',
    dataKind: 'DERIVED',
    inputs,
  };
}

export function calculateDewPoint(tempC: number | null, rhPercent: number | null): DerivedMetric {
  const inputs: string[] = [];
  if (tempC != null) inputs.push('temperature');
  if (rhPercent != null) inputs.push('humidity');

  if (!Number.isFinite(tempC) || !Number.isFinite(rhPercent) || rhPercent! <= 0) {
    return {
      id: 'dew_point',
      label: 'Точка росы',
      value: null,
      unit: '°C',
      available: false,
      quality: 'missing',
      dataKind: 'DERIVED',
      inputs,
    };
  }

  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC!) / (b + tempC!) + Math.log(rhPercent! / 100);
  const dew = (b * alpha) / (a - alpha);

  return {
    id: 'dew_point',
    label: 'Точка росы',
    value: Number(dew.toFixed(1)),
    unit: '°C',
    available: true,
    quality: 'fresh',
    dataKind: 'DERIVED',
    inputs,
  };
}

/** DLI requires PPFD integration — not available without light sensor PPFD data */
export function calculateDliPlaceholder(): DerivedMetric {
  return {
    id: 'dli',
    label: 'DLI',
    value: null,
    unit: 'mol/m²/day',
    available: false,
    quality: 'missing',
    dataKind: 'UNKNOWN',
    inputs: ['ppfd'],
  };
}

/** @deprecated use domain/agronomy/vpd.analyzeVpd */
export { saturationVaporPressureKpa };
