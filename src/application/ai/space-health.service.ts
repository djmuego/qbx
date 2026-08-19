import type { GrowContext } from '../../domain/ai/grow-context.types';
import type { SpaceHealthFactor, SpaceHealthLabel, SpaceHealthSummary } from '../../domain/ai/space-health.types';
import { analyzeVpd } from '../../domain/agronomy/vpd';

function factor(
  id: string,
  label: string,
  status: SpaceHealthFactor['status'],
  detail?: string,
): SpaceHealthFactor {
  return { id, label, status, detail };
}

function scoreFromFactors(factors: SpaceHealthFactor[]): number {
  if (factors.every((f) => f.status === 'unknown')) return 0;
  let score = 100;
  for (const f of factors) {
    if (f.status === 'critical') score -= 25;
    else if (f.status === 'warning') score -= 12;
    else if (f.status === 'unknown') score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

function labelFromScore(score: number, hasData: boolean): SpaceHealthLabel {
  if (!hasData) return 'Нет данных';
  if (score >= 90) return 'Отлично';
  if (score >= 75) return 'Хорошо';
  if (score >= 50) return 'Требует внимания';
  return 'Критично';
}

export function computeSpaceHealth(context: GrowContext, nowMs = Date.now()): SpaceHealthSummary {
  const factors: SpaceHealthFactor[] = [];
  const hasLive = context.dataQuality.hasLiveSensorData;

  if (!context.space || !context.dataQuality.hasDevices) {
    return {
      score: 0,
      label: 'Нет данных',
      factors: [factor('data', 'Данные', 'unknown', 'Нет подключённых устройств')],
      computedAtMs: nowMs,
    };
  }

  if (context.alerts.emergencyActive) {
    factors.push(factor('emergency', 'Emergency Off', 'critical', 'Все выходы остановлены'));
  }

  const temp = context.environment.sensors.find((s) => s.type === 'temperature' && s.quality === 'fresh' && s.value != null);
  if (temp) {
    let status: SpaceHealthFactor['status'] = 'ok';
    if (temp.optimalMin != null && temp.value! < temp.optimalMin) status = 'warning';
    if (temp.optimalMax != null && temp.value! > temp.optimalMax) status = 'warning';
    factors.push(factor('temperature', 'Температура', status, temp.value != null ? `${temp.value}${temp.unit}` : undefined));
  } else {
    factors.push(factor('temperature', 'Температура', 'unknown'));
  }

  const rh = context.environment.sensors.find((s) => s.type === 'humidity' && s.quality === 'fresh' && s.value != null);
  if (rh) {
    let status: SpaceHealthFactor['status'] = 'ok';
    if (rh.optimalMin != null && rh.value! < rh.optimalMin) status = 'warning';
    if (rh.optimalMax != null && rh.value! > rh.optimalMax) status = 'warning';
    factors.push(factor('humidity', 'Влажность', status, `${rh.value}${rh.unit}`));
  } else {
    factors.push(factor('humidity', 'Влажность', 'unknown'));
  }

  if (temp && rh) {
    const vpd = analyzeVpd({ airTempC: temp.value, relativeHumidityPercent: rh.value }, context.targets.vpd);
    const status: SpaceHealthFactor['status'] =
      vpd.classification === 'optimal' ? 'ok' : vpd.classification === 'unknown' ? 'unknown' : 'warning';
    factors.push(factor('vpd', 'VPD', status, vpd.valueKpa != null ? `${vpd.valueKpa} kPa` : undefined));
  } else {
    factors.push(factor('vpd', 'VPD', 'unknown'));
  }

  const co2 = context.environment.sensors.find((s) => s.type === 'co2' && s.quality === 'fresh');
  if (co2?.value != null) {
    let status: SpaceHealthFactor['status'] = 'ok';
    if (co2.optimalMax != null && co2.value > co2.optimalMax) status = 'warning';
    factors.push(factor('co2', 'CO₂', status, `${co2.value}${co2.unit}`));
  } else {
    factors.push(factor('co2', 'CO₂', 'unknown'));
  }

  const soil = context.substrate.soilMoistureSensors.find((s) => s.quality === 'fresh' && s.value != null);
  if (soil) {
    let status: SpaceHealthFactor['status'] = 'ok';
    if (soil.optimalMin != null && soil.value! < soil.optimalMin) status = 'warning';
    if (soil.optimalMax != null && soil.value! > soil.optimalMax) status = 'warning';
    factors.push(factor('substrate', 'Влажность субстрата', status, `${soil.value}${soil.unit}`));
  } else {
    factors.push(factor('substrate', 'Влажность субстрата', 'unknown'));
  }

  const light = context.lighting.lightSensors.find((s) => s.quality === 'fresh' && s.value != null);
  factors.push(
    light
      ? factor('light', 'Свет', 'ok', `${light.value}${light.unit}`)
      : factor('light', 'Свет', 'unknown'),
  );

  if (context.dataQuality.offlineDevices > 0 || context.dataQuality.staleSensors.length > 0) {
    factors.push(
      factor(
        'connectivity',
        'Связь',
        context.dataQuality.offlineDevices > 0 ? 'warning' : 'ok',
        context.dataQuality.staleSensors.length
          ? `stale: ${context.dataQuality.staleSensors.join(', ')}`
          : undefined,
      ),
    );
  }

  const score = scoreFromFactors(factors);
  return {
    score,
    label: labelFromScore(score, hasLive),
    factors,
    computedAtMs: nowMs,
  };
}
