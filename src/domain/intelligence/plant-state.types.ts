import type { GrowAgentConfidence } from '../ai/grow-agent-response.types';

export type PlantStateCategory =
  | 'climate'
  | 'rootZone'
  | 'water'
  | 'nutrition'
  | 'light'
  | 'gasExchange'
  | 'plantStress'
  | 'equipment'
  | 'dataQuality';

export type PlantStateStatus = 'ok' | 'attention' | 'critical' | 'unknown';

export interface PlantStateDimension {
  category: PlantStateCategory;
  score: number;
  status: PlantStateStatus;
  evidence: string[];
  confidence: GrowAgentConfidence;
  summary: string;
}

export interface PlantStateAssessment {
  overallScore: number;
  overallStatus: PlantStateStatus;
  dimensions: PlantStateDimension[];
  assessedAtMs: number;
}
