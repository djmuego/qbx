import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { LightingAnalysis } from '../../domain/intelligence/analysis.types';

export function analyzeLighting(context: CultivationContext): LightingAnalysis {
  const lightOn = context.equipment.some((e) => e.type === 'lighting' && e.reportedState);
  const ppfdSensor = context.environment.sensors.find((s) => s.type === 'light' && s.quality === 'fresh');
  const dliMetric = context.environment.derivedMetrics.find((m) => m.id === 'dli');
  const photoperiodHours = context.targets.lightHours?.max ?? context.targets.lightHours?.preferred;

  if (!lightOn && !ppfdSensor && !dliMetric?.available) {
    return {
      available: false,
      ppfdAvailable: false,
      lightOnButInsufficientDli: false,
      summary: 'Нет данных освещения — не оцениваем DLI.',
      evidence: ['missing PPFD/light sensor', 'no DLI derived'],
      confidence: 'low',
    };
  }

  const dliEstimate = dliMetric?.available ? dliMetric.value ?? undefined : undefined;
  const lightOnButInsufficientDli = Boolean(lightOn && !ppfdSensor && !dliMetric?.available);

  return {
    available: true,
    photoperiodHours: photoperiodHours,
    dliEstimate,
    ppfdAvailable: Boolean(ppfdSensor),
    actualVsTarget: dliEstimate != null ? 'unknown' : 'unknown',
    lightOnButInsufficientDli,
    summary: lightOnButInsufficientDli
      ? 'Свет включён, но DLI неизвестен — это разные вещи.'
      : ppfdSensor
        ? 'PPFD доступен для оценки DLI.'
        : 'Только schedule/ON state без PPFD.',
    evidence: [
      `lightOn=${lightOn}`,
      `ppfdSensor=${Boolean(ppfdSensor)}`,
      `dliAvailable=${Boolean(dliMetric?.available)}`,
    ],
    confidence: ppfdSensor ? 'medium' : 'low',
  };
}
