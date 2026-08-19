import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import { isCultivationContext } from '../../domain/ai/cultivation-context.types';
import type { GrowContext } from '../../domain/ai/grow-context.types';
import type { IntelligentAlert } from '../../domain/ai/intelligent-alert.types';
import { analyzeVpd } from '../../domain/agronomy/vpd';

function alertId(type: string, key: string): string {
  return `${type}:${key}`;
}

export function analyzeTrends(context: GrowContext | CultivationContext): IntelligentAlert[] {
  const alerts: IntelligentAlert[] = [];
  const now = context.meta.capturedAtMs;

  for (const s of context.environment.sensors) {
    if (s.quality === 'stale') {
      alerts.push({
        id: alertId('sensor_stale', s.id),
        type: 'sensor_stale',
        severity: 'warning',
        title: `Данные устарели: ${s.name}`,
        message: 'Последнее значение не считается текущим — агрономические выводы ограничены.',
        evidence: [`${s.name}: quality=stale`],
        sensorId: s.id,
      });
    }

    if (!s.deviceOnline && s.available) {
      alerts.push({
        id: alertId('sensor_offline', s.id),
        type: 'sensor_offline',
        severity: 'warning',
        title: `Датчик offline: ${s.name}`,
        message: 'Контроллер или датчик недоступен.',
        evidence: [`device ${s.deviceId}: offline`],
        sensorId: s.id,
        deviceId: s.deviceId,
      });
    }

    const summary = context.environment.telemetrySummary.find((t) => t.sensorId === s.id);
    const window1h = summary?.windows.find((w) => w.window === '1h');
    if (window1h && window1h.trend === 'rising' && s.type === 'temperature' && s.value != null) {
      const rate = window1h.rateOfChange;
      if (rate != null && rate > 0.5) {
        alerts.push({
          id: alertId('rapid_change', s.id),
          type: 'rapid_change',
          severity: s.optimalMax != null && s.value! > s.optimalMax - 1 ? 'warning' : 'info',
          title: `${s.name} растёт`,
          message: `Температура растёт последний час (+${rate.toFixed(1)}${s.unit}). При текущем тренде возможно превышение целевого диапазона.`,
          evidence: [`${s.name}: ${s.value}${s.unit}`, `trend=rising`, `Δ1h=${rate}`],
          trendSummary: `+${rate}${s.unit}/1h`,
          sensorId: s.id,
        });
      }
    }

    if (s.quality === 'fresh' && s.value != null && s.optimalMax != null && s.value > s.optimalMax) {
      alerts.push({
        id: alertId('threshold_deviation', s.id),
        type: 'threshold_deviation',
        severity: 'warning',
        title: `${s.name} выше цели`,
        message: `${s.value}${s.unit} при max ${s.optimalMax}${s.unit}.`,
        evidence: [`${s.name}=${s.value}${s.unit}`, `target max=${s.optimalMax}`],
        sensorId: s.id,
      });
    }
  }

  for (const soil of context.substrate.soilMoistureSensors) {
    const summary = context.environment.telemetrySummary.find((t) => t.sensorId === soil.id);
    const window1h = summary?.windows.find((w) => w.window === '1h');
    if (
      soil.quality === 'fresh' &&
      soil.value != null &&
      window1h?.trend === 'falling' &&
      window1h.rateOfChange != null &&
      window1h.rateOfChange < -2
    ) {
      alerts.push({
        id: alertId('substrate_dryback', soil.id),
        type: 'substrate_dryback_anomaly',
        severity: 'warning',
        title: 'Субстрат быстро сохнет',
        message: `Влажность падает (${window1h.rateOfChange}${soil.unit}/1h). Проверьте полив и transpiration.`,
        evidence: [`${soil.name}=${soil.value}${soil.unit}`, `trend=falling`],
        trendSummary: `${window1h.rateOfChange}${soil.unit}/1h`,
        sensorId: soil.id,
      });
    }
  }

  if (context.dataQuality.offlineDevices > 0) {
    alerts.push({
      id: alertId('device_offline', 'space'),
      type: 'device_offline',
      severity: 'warning',
      title: 'Устройства offline',
      message: `${context.dataQuality.offlineDevices} контроллер(ов) offline — данные неполные.`,
      evidence: [`offlineDevices=${context.dataQuality.offlineDevices}`],
    });
  }

  if (context.alerts.emergencyActive) {
    alerts.push({
      id: alertId('unexpected_equipment', 'emergency'),
      type: 'unexpected_equipment_state',
      severity: 'critical',
      title: 'Emergency Off активен',
      message: 'Все выходы остановлены. AI не управляет оборудованием.',
      evidence: ['emergencyActive=true'],
    });
  }

  const temp = context.environment.sensors.find((s) => s.type === 'temperature' && s.quality === 'fresh' && s.value != null);
  const rh = context.environment.sensors.find((s) => s.type === 'humidity' && s.quality === 'fresh' && s.value != null);
  if (temp && rh) {
    const vpd = analyzeVpd(
      { airTempC: temp.value, relativeHumidityPercent: rh.value },
      context.targets.vpd,
    );
    if (vpd.available && vpd.classification !== 'optimal' && vpd.classification !== 'unknown') {
      alerts.push({
        id: alertId('vpd_deviation', 'env'),
        type: 'vpd_deviation',
        severity: vpd.classification === 'high' ? 'warning' : 'info',
        title: `VPD ${vpd.classification === 'high' ? 'высокий' : 'низкий'}`,
        message: vpd.detail,
        evidence: [`VPD=${vpd.valueKpa} kPa`, `temp=${temp.value}°C`, `RH=${rh.value}%`],
      });
    }
  }

  const co2 = context.environment.sensors.find((s) => s.type === 'co2' && s.quality === 'fresh' && s.value != null);
  if (co2 && co2.optimalMax != null && co2.value > co2.optimalMax) {
    alerts.push({
      id: alertId('co2_deviation', co2.id),
      type: 'co2_deviation',
      severity: 'info',
      title: 'CO₂ выше цели',
      message: `${co2.value}${co2.unit} при max ${co2.optimalMax}${co2.unit}.`,
      evidence: [`CO2=${co2.value}`],
      sensorId: co2.id,
    });
  }

  for (const eq of context.equipment) {
    if (eq.reportedState && eq.controlMode === 'manual' && eq.type === 'ventilation') {
      const tempHigh = temp && temp.optimalMax != null && temp.value! > temp.optimalMax;
      if (tempHigh) {
        alerts.push({
          id: alertId('prolonged_output', eq.outputId),
          type: 'prolonged_output_activity',
          severity: 'info',
          title: `${eq.name} работает вручную`,
          message: 'Вентиляция ON при перегреве — проверьте, достаточно ли эффекта по тренду.',
          evidence: [`${eq.name}=ON`, `controlMode=manual`],
          deviceId: eq.deviceId,
        });
      }
    }
  }

  void now;
  return alerts;
}
