import { buildCultivationContext, type BuildCultivationContextInput } from '../ai/cultivation-context.builder';
import type { IntelligenceContext } from '../../domain/intelligence/intelligence-context.types';
import { detectAnomalies } from './anomaly-engine.service';
import { analyzeIrrigation } from './irrigation-analysis.service';
import { analyzeLighting } from './lighting-analysis.service';
import { analyzeCo2 } from './co2-analysis.service';
import { assessPlantState } from './plant-state.service';
import { evaluateAiEscalation } from './ai-escalation-policy';
import { assessKnowledgeCoverage } from './knowledge-coverage.service';
import { recommendSensors } from './sensor-recommendation.service';
import { buildDailyBriefing } from './daily-briefing.service';
import { toGeometrySnapshot } from '../../domain/map/space-map.geometry';
import { buildSpatialContext } from './spatial-context.builder';
import type { SpaceDigitalTwin } from '../../domain/intelligence/digital-twin.types';
import type { GrowMemorySummary } from '../../domain/intelligence/grow-memory.types';
import { AGENT_KNOWLEDGE_INDEX } from '../ai/knowledge/generated/agent-knowledge.index.ts';

function buildDigitalTwin(
  base: ReturnType<typeof buildCultivationContext>,
  input: BuildCultivationContextInput,
): SpaceDigitalTwin {
  const geometry = input.space?.dimensions
    ? toGeometrySnapshot(input.space.dimensions, input.spaceMap)
    : undefined;
  return {
    spaceId: base.space?.id ?? '',
    spaceName: base.space?.name ?? '',
    growRun: null,
    cropProfile: base.crop?.dataKind === 'FACT' ? { cropId: base.crop.cropId!, commonName: base.crop.commonName! } : null,
    environmentType: 'unknown',
    zoneCount: geometry?.zoneCount ?? 0,
    sensorCount: base.environment.sensors.length,
    equipmentCount: base.equipment.length,
    automationCount: base.automations.length,
    hasLiveTelemetry: base.dataQuality.hasLiveSensorData,
    dataQualityScore: base.dataQuality.hasLiveSensorData ? 85 : 0,
    capturedAtMs: base.meta.capturedAtMs,
    geometry,
  };
}

function buildGrowMemory(base: ReturnType<typeof buildCultivationContext>): GrowMemorySummary {
  const trustCounts: Record<string, number> = {};
  for (const e of AGENT_KNOWLEDGE_INDEX) {
    trustCounts[e.trust] = (trustCounts[e.trust] ?? 0) + 1;
  }
  return {
    knowledge: {
      topicsAvailable: [...new Set(AGENT_KNOWLEDGE_INDEX.flatMap((e) => e.topics))],
      trustCounts,
    },
    growRun: { notableEvents: base.recentJournal.map((j) => j.title) },
    facility: { spaceId: base.space?.id ?? '', equipmentObservations: [], lastEffectVerifications: [] },
  };
}

export function buildIntelligenceContext(input: BuildCultivationContextInput): IntelligenceContext {
  const base = buildCultivationContext(input);
  const knowledgeCoverage = assessKnowledgeCoverage(base);
  const escalation = evaluateAiEscalation(base, { knowledgeCoveragePercent: knowledgeCoverage.overallPercent });

  return {
    ...base,
    digitalTwin: buildDigitalTwin(base, input),
    plantState: assessPlantState(base),
    irrigationAnalysis: analyzeIrrigation(base),
    lightingAnalysis: analyzeLighting(base),
    co2Analysis: analyzeCo2(base),
    issueHypotheses: [],
    predictions: [],
    anomalies: detectAnomalies(base),
    knowledgeCoverage,
    sensorRecommendations: recommendSensors(base),
    escalation,
    dailyBriefing: buildDailyBriefing(base),
    growMemory: buildGrowMemory(base),
    recentEffectVerifications: [],
    spatial:
      input.space && input.spaceMap
        ? buildSpatialContext({ space: input.space, map: input.spaceMap, devices: input.devices })
        : undefined,
  };
}
