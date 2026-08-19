import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { AnomalyFinding } from '../../domain/intelligence/anomaly.types';

function id(kind: string, key: string) {
  return `${kind}:${key}`;
}

export function detectAnomalies(context: CultivationContext): AnomalyFinding[] {
  const findings: AnomalyFinding[] = [];
  const temp = context.environment.sensors.find((s) => s.type === 'temperature' && s.quality === 'fresh');
  const fanOn = context.equipment.some(
    (e) => (e.type === 'ventilation' || /вент|vent/i.test(e.name)) && e.reportedState,
  );
  const tempRising = context.intelligentAlerts.some((a) => a.type === 'rapid_change' && a.sensorId === temp?.id);
  const tempAboveTarget = temp && temp.optimalMax != null && temp.value != null && temp.value > temp.optimalMax;

  if (fanOn && tempAboveTarget && tempRising) {
    findings.push({
      id: id('fan_no_effect', temp!.id),
      kind: 'fan_no_effect',
      severity: 'warning',
      title: 'Вентиляция активна, охлаждение недостаточно',
      message:
        'Вентилятор уже включён, но температура продолжает расти или остаётся выше цели. Эффект может быть недостаточным.',
      evidence: [
        `temp=${temp!.value}${temp!.unit}`,
        `target max=${temp!.optimalMax}`,
        'ventilation=ON',
        'trend=rising',
      ],
      possibleCauses: ['airflow', 'outside heat load', 'cooling capacity', 'sensor placement'],
      requiresUserAction: true,
    });
  }

  for (const soil of context.substrate.soilMoistureSensors) {
    const irrigationEvents = context.recentEvents.filter((e) => /irrigation|poliv|water|pump|полив/i.test(e.type + e.message)).length;
    const summary = context.environment.telemetrySummary.find((t) => t.sensorId === soil.id);
    const falling = summary?.windows.find((w) => w.window === '1h')?.trend === 'falling';
    if (soil.quality === 'fresh' && falling && irrigationEvents >= 2) {
      findings.push({
        id: id('irrigation_no_response', soil.id),
        kind: 'irrigation_no_response',
        severity: 'warning',
        title: 'Полив без ответа субстрата',
        message: 'Насос работал, но влажность субстрата продолжает падать.',
        evidence: [`soil=${soil.value}${soil.unit}`, `irrigationEvents=${irrigationEvents}`],
        possibleCauses: ['pump', 'valve', 'empty tank', 'blocked line', 'sensor', 'unexpected demand'],
        requiresUserAction: true,
      });
    }
  }

  const co2 = context.environment.sensors.find((s) => s.type === 'co2' && s.quality === 'fresh' && s.value != null);
  const exhaustOn = context.equipment.some(
    (e) => (e.type === 'ventilation' || /вытяж|exhaust/i.test(e.name)) && e.reportedState,
  );
  if (co2 && co2.value > 800 && exhaustOn) {
    findings.push({
      id: id('co2_vent_conflict', 'space'),
      kind: 'co2_vent_conflict',
      severity: 'info',
      title: 'CO₂ высокий при активной вытяжке',
      message: 'Стратегии обогащения CO₂ и выброса воздуха могут конфликтовать.',
      evidence: [`CO2=${co2.value}`, 'exhaust/vent=ON'],
      requiresUserAction: false,
    });
  }

  for (const s of context.environment.sensors) {
    if (s.quality === 'stale') {
      findings.push({
        id: id('sensor_stale', s.id),
        kind: 'sensor_stale',
        severity: 'warning',
        title: `Датчик stale: ${s.name}`,
        message: 'Значение не считается текущим — выводы ограничены.',
        evidence: [`${s.name}: stale`],
        requiresUserAction: true,
      });
    }
  }

  if (!context.dataQuality.hasLiveSensorData && context.meta.runtimeMode === 'hardware') {
    findings.push({
      id: id('no_data', 'space'),
      kind: 'sensor_stale',
      severity: 'critical',
      title: 'Нет live-данных',
      message: 'Hardware mode без свежих показаний — честное состояние UNKNOWN.',
      evidence: ['hasLiveSensorData=false'],
      requiresUserAction: true,
    });
  }

  return findings;
}
