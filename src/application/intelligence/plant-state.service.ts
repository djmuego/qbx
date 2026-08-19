import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { PlantStateAssessment, PlantStateDimension } from '../../domain/intelligence/plant-state.types';

function factorScore(status: PlantStateDimension['status']): number {
  switch (status) {
    case 'ok':
      return 90;
    case 'attention':
      return 65;
    case 'critical':
      return 30;
    default:
      return 0;
  }
}

function dim(
  category: PlantStateDimension['category'],
  status: PlantStateDimension['status'],
  summary: string,
  evidence: string[],
): PlantStateDimension {
  const score = factorScore(status);
  return {
    category,
    score,
    status,
    summary,
    evidence,
    confidence: status === 'unknown' ? 'low' : score > 70 ? 'medium' : 'low',
  };
}

export function assessPlantState(context: CultivationContext): PlantStateAssessment {
  if (!context.dataQuality.hasLiveSensorData) {
    return {
      overallScore: 0,
      overallStatus: 'unknown',
      dimensions: [
        dim('dataQuality', 'unknown', 'No live telemetry', [`hasLive=false`, `runtime=${context.meta.runtimeMode}`]),
      ],
      assessedAtMs: context.meta.capturedAtMs,
    };
  }

  const h = context.health;
  const tempFactor = h.factors.find((f) => f.id === 'temperature');
  const dimensions: PlantStateDimension[] = [
    dim(
      'climate',
      tempFactor?.status === 'ok' ? 'ok' : tempFactor?.status === 'critical' ? 'critical' : h.score > 50 ? 'attention' : 'unknown',
      'Климат по temp/RH/VPD',
      h.factors.map((f) => `${f.id}=${f.status}`),
    ),
    dim(
      'rootZone',
      context.substrate.soilMoistureSensors.some((s) => s.quality === 'fresh') ? (h.score > 70 ? 'ok' : 'attention') : 'unknown',
      context.substrate.soilMoistureSensors.some((s) => s.quality === 'fresh') ? 'Субстрат измерен' : 'Субстрат неизвестен',
      context.substrate.soilMoistureSensors.map((s) => `${s.name}=${s.value}`),
    ),
    dim(
      'dataQuality',
      context.dataQuality.hasLiveSensorData ? 'ok' : 'unknown',
      context.dataQuality.hasLiveSensorData ? 'Live telemetry' : 'No live data',
      [`hasLive=${context.dataQuality.hasLiveSensorData}`],
    ),
    dim(
      'light',
      context.environment.derivedMetrics.find((m) => m.id === 'dli')?.available ? 'ok' : 'unknown',
      'DLI/PPFD coverage',
      [`missingLight=${context.dataQuality.missingSensors.includes('light')}`],
    ),
    dim(
      'nutrition',
      context.environment.sensors.some((s) => s.type === 'ec' && s.quality === 'fresh') ? 'attention' : 'unknown',
      'EC/pH availability',
      [`ec=${context.environment.sensors.some((s) => s.type === 'ec')}`],
    ),
    dim('equipment', context.dataQuality.offlineDevices === 0 ? 'ok' : 'attention', 'Equipment online', [`offline=${context.dataQuality.offlineDevices}`]),
  ];

  const overallScore = Math.round(dimensions.reduce((a, d) => a + d.score, 0) / dimensions.length);
  const overallStatus = overallScore > 80 ? 'ok' : overallScore > 55 ? 'attention' : overallScore === 0 ? 'unknown' : 'critical';

  return { overallScore, overallStatus, dimensions, assessedAtMs: context.meta.capturedAtMs };
}
