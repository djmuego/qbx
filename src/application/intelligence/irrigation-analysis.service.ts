import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { IrrigationAnalysis } from '../../domain/intelligence/analysis.types';

export function analyzeIrrigation(context: CultivationContext): IrrigationAnalysis {
  const soil = context.substrate.soilMoistureSensors.find((s) => s.quality === 'fresh' && s.value != null);
  if (!soil) {
    return {
      available: false,
      anomalyDetected: false,
      summary: 'Нет данных субстрата для irrigation analysis.',
      evidence: context.dataQuality.missingSensors.includes('soil_moisture')
        ? ['missing: soil_moisture']
        : ['no fresh substrate reading'],
      confidence: 'low',
    };
  }

  const summary = context.environment.telemetrySummary.find((t) => t.sensorId === soil.id);
  const window1h = summary?.windows.find((w) => w.window === '1h');
  const drybackRate = window1h?.rateOfChange != null && window1h.trend === 'falling' ? Math.abs(window1h.rateOfChange) : undefined;
  const irrigationEvents = context.recentEvents.filter((e) => /irrigation|poliv|water|pump|полив/i.test(e.type + e.message)).length;
  const pumpRan = context.equipment.some(
    (e) => ['watering', 'valve', 'pump'].includes(e.type) && e.reportedState,
  );
  const falling = window1h?.trend === 'falling';
  let responseAfterIrrigation: IrrigationAnalysis['responseAfterIrrigation'] = 'unknown';
  if (pumpRan && window1h?.trend === 'rising') responseAfterIrrigation = 'normal';
  if (irrigationEvents >= 2 && falling) responseAfterIrrigation = 'none';

  const anomalyDetected = irrigationEvents >= 2 && falling;

  return {
    available: true,
    drybackRatePerHour: drybackRate,
    responseAfterIrrigation,
    anomalyDetected,
    summary: anomalyDetected
      ? 'Полив выполнялся, но субстрат не восстанавливается — возможная anomaly.'
      : drybackRate != null
        ? `Dryback ~${drybackRate.toFixed(1)}${soil.unit}/ч.`
        : 'Субстрат в норме по доступным данным.',
    evidence: [`soil=${soil.value}${soil.unit}`, `irrigationEvents=${irrigationEvents}`, `pumpActive=${pumpRan}`],
    possibleCauses: anomalyDetected
      ? ['pump', 'valve', 'empty tank', 'blocked line', 'sensor', 'configuration']
      : undefined,
    confidence: anomalyDetected ? 'medium' : 'medium',
  };
}
