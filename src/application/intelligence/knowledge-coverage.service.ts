import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { KnowledgeCoverageReport } from '../../domain/intelligence/knowledge-coverage.types';
import { AGENT_KNOWLEDGE_INDEX } from '../ai/knowledge/generated/agent-knowledge.index.ts';

const TOPIC_WEIGHTS: Record<string, string[]> = {
  climate: ['climate', 'humidity-vpd'],
  lighting: ['lighting'],
  irrigation: ['irrigation', 'substrate'],
  nutrition: ['ph-ec', 'nutrition', 'hydroponics'],
  co2: ['co2'],
  stress: ['plant-stress', 'disease-basics'],
};

export function assessKnowledgeCoverage(context: CultivationContext): KnowledgeCoverageReport {
  const cropId = context.crop?.dataKind === 'FACT' ? context.crop.cropId : undefined;
  const stageId = context.growStage.stageId;
  const dimensions = Object.entries(TOPIC_WEIGHTS).map(([topic, tags]) => {
    const docs = AGENT_KNOWLEDGE_INDEX.filter(
      (e) =>
        e.topics.some((t) => tags.includes(t)) ||
        (cropId && e.cropId === cropId) ||
        e.type === 'guide' ||
        e.type === 'core',
    );
    const verified = docs.filter((d) => d.trust === 'VERIFIED' || (d.trust as string).startsWith('VERIFIED')).length;
    const cropDoc = cropId ? AGENT_KNOWLEDGE_INDEX.find((e) => e.cropId === cropId) : undefined;
    let coverage = Math.min(100, Math.round((docs.length / 3) * 30 + verified * 10));
    if (cropDoc) coverage = Math.min(100, coverage + 20);
    if (topic === 'nutrition' && !context.environment.sensors.some((s) => s.type === 'ec')) {
      coverage = Math.min(coverage, 35);
    }
    const gaps: string[] = [];
    if (coverage < 50) gaps.push(`Limited ${topic} knowledge for ${cropId ?? 'general'} / ${stageId}`);
    return {
      topic,
      coveragePercent: coverage,
      trustLevel: verified > 0 ? 'VERIFIED present' : 'PROJECT_DECISION only',
      gaps,
    };
  });

  const overallPercent = Math.round(dimensions.reduce((a, d) => a + d.coveragePercent, 0) / dimensions.length);
  const honestLimitations: string[] = [];
  if (overallPercent < 60) {
    honestLimitations.push('Для уверенных рекомендаций по некоторым темам недостаточно проверенной базы.');
  }
  if (!context.dataQuality.hasCropProfile) {
    honestLimitations.push('Культура не указана — coverage по crop/stage снижен.');
  }

  return { cropId, stageId, overallPercent, dimensions, honestLimitations };
}
