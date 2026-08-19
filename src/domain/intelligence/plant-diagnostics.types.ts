import type { GrowAgentConfidence } from '../ai/grow-agent-response.types';

export type PlantIssueCategory =
  | 'waterStress'
  | 'heatStress'
  | 'coldStress'
  | 'humidityStress'
  | 'lightStress'
  | 'nutrientPossible'
  | 'rootZonePossible'
  | 'diseasePossible'
  | 'pestPossible'
  | 'unknown';

export interface PlantIssueHypothesis {
  id: string;
  category: PlantIssueCategory;
  possibleIssue: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  missingEvidence: string[];
  confidence: GrowAgentConfidence;
  recommendedChecks: string[];
}
