import type { CultivationContext } from '../ai/cultivation-context.types';
import type { AiEscalationDecision } from './ai-escalation.types';
import type { AnomalyFinding } from './anomaly.types';
import type { SpaceDigitalTwin } from './digital-twin.types';
import type { EffectVerification } from './effect-verification.types';
import type { GrowMemorySummary } from './grow-memory.types';
import type { PlantIssueHypothesis } from './plant-diagnostics.types';
import type { PlantStateAssessment } from './plant-state.types';
import type { Prediction } from './prediction.types';
import type { Co2Analysis, CropSteeringAssessment, IrrigationAnalysis, LightingAnalysis, NutritionAssessment } from './analysis.types';
import type { DailyBriefing } from './daily-briefing.types';
import type { KnowledgeCoverageReport } from './knowledge-coverage.types';
import type { SensorRecommendation } from './sensor-recommendation.types';
import type { SpatialContext } from '../map/spatial-intelligence.types';

/** Intelligence Foundation V2 — extends CultivationContext (analysis fields are additive) */
export interface IntelligenceContext extends CultivationContext {
  digitalTwin: SpaceDigitalTwin;
  plantState: PlantStateAssessment;
  irrigationAnalysis?: IrrigationAnalysis;
  lightingAnalysis?: LightingAnalysis;
  co2Analysis?: Co2Analysis;
  nutritionAnalysis?: NutritionAssessment;
  cropSteering?: CropSteeringAssessment;
  issueHypotheses: PlantIssueHypothesis[];
  predictions: Prediction[];
  anomalies: AnomalyFinding[];
  knowledgeCoverage: KnowledgeCoverageReport;
  sensorRecommendations: SensorRecommendation[];
  escalation: AiEscalationDecision;
  dailyBriefing?: DailyBriefing;
  growMemory: GrowMemorySummary;
  recentEffectVerifications: EffectVerification[];
  spatial?: SpatialContext;
}

export function isIntelligenceContext(ctx: CultivationContext): ctx is IntelligenceContext {
  return 'digitalTwin' in ctx && 'plantState' in ctx;
}
