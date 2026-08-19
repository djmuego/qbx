import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { DailyBriefing } from '../../domain/intelligence/daily-briefing.types';

export function buildDailyBriefing(context: CultivationContext): DailyBriefing | undefined {
  if (!context.dataQuality.hasLiveSensorData) return undefined;

  const highlights: string[] = [];
  if (context.environment.derivedMetrics.find((m) => m.id === 'vpd')?.available) {
    highlights.push('VPD рассчитан по live temp/RH');
  }
  if (context.recentEvents.some((e) => /irrigation|poliv|полив/i.test(e.message))) {
    highlights.push(`Поливов за период: ${context.recentEvents.filter((e) => /irrigation|poliv|полив/i.test(e.message)).length}`);
  }
  if (context.intelligentAlerts.some((a) => a.type === 'substrate_dryback_anomaly')) {
    highlights.push('Dryback вне ожидаемого паттерна');
  }
  if (context.dataQuality.offlineDevices === 0) {
    highlights.push('Оборудование online');
  }

  const tempAlerts = context.intelligentAlerts.filter((a) => a.type === 'threshold_deviation');
  if (tempAlerts.length) {
    highlights.push(`Температура вне цели: ${tempAlerts.length} событий`);
  }

  return {
    headline: context.health.label,
    healthScore: context.health.score,
    healthLabel: context.health.label,
    overnightSummary:
      context.health.score >= 85
        ? 'Ночь прошла стабильно по доступным FACT-данным.'
        : 'Есть отклонения — см. highlights.',
    highlights,
    todayActions: context.missingData.slice(0, 2).map((m) => `Проверить: ${m}`),
    generatedAtMs: context.meta.capturedAtMs,
    source: 'local',
  };
}
