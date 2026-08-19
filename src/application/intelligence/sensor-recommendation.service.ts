import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { SensorRecommendation } from '../../domain/intelligence/sensor-recommendation.types';

export function recommendSensors(context: CultivationContext): SensorRecommendation[] {
  const recs: SensorRecommendation[] = [];
  const missing = new Set(context.dataQuality.missingSensors);

  if (missing.has('light')) {
    recs.push({
      sensorType: 'PPFD / light',
      priority: 'high',
      valueReason: 'Существенно улучшит оценку DLI и отличит «свет ON» от достаточного света.',
      improvesTopics: ['lighting', 'crop steering'],
    });
  }
  if (missing.has('ec') && (context.crop?.medium === 'hydroponics' || context.crop?.medium === 'coco')) {
    recs.push({
      sensorType: 'EC',
      priority: 'high',
      valueReason: 'Для hydro/coco EC важнее второго humidity sensor.',
      improvesTopics: ['nutrition', 'root zone'],
    });
  }
  if (missing.has('soil_moisture')) {
    recs.push({
      sensorType: 'substrate moisture / VWC',
      priority: 'high',
      valueReason: 'Необходим для dryback и irrigation response analysis.',
      improvesTopics: ['irrigation', 'crop steering'],
    });
  }
  if (missing.has('co2') && context.equipment.some((e) => e.type === 'lighting')) {
    recs.push({
      sensorType: 'CO₂',
      priority: 'medium',
      valueReason: 'Без CO₂ sensor enrichment recommendations остаются гипотезой.',
      improvesTopics: ['gas exchange'],
    });
  }

  return recs;
}
