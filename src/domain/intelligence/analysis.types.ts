import type { GrowAgentConfidence } from '../ai/grow-agent-response.types';

export interface IrrigationAnalysis {
  available: boolean;
  drybackRatePerHour?: number;
  timeSinceLastIrrigationMinutes?: number;
  responseAfterIrrigation?: 'normal' | 'weak' | 'none' | 'unknown';
  nightDryback?: 'normal' | 'high' | 'unknown';
  anomalyDetected: boolean;
  summary: string;
  evidence: string[];
  possibleCauses?: string[];
  confidence: GrowAgentConfidence;
}

export interface LightingAnalysis {
  available: boolean;
  photoperiodHours?: number;
  dliEstimate?: number;
  ppfdAvailable: boolean;
  actualVsTarget?: 'below' | 'within' | 'above' | 'unknown';
  lightOnButInsufficientDli: boolean;
  summary: string;
  evidence: string[];
  confidence: GrowAgentConfidence;
}

export interface Co2Analysis {
  available: boolean;
  co2Known: boolean;
  enrichmentRecommended: boolean;
  ventConflict: boolean;
  summary: string;
  evidence: string[];
  confidence: GrowAgentConfidence;
}

export interface NutritionAssessment {
  available: boolean;
  ecKnown: boolean;
  phKnown: boolean;
  summary: string;
  evidence: string[];
  confidence: GrowAgentConfidence;
}

export type CropSteeringStrategy = 'neutral' | 'vegetative' | 'generative' | 'custom';

export interface CropSteeringAssessment {
  available: boolean;
  strategy: CropSteeringStrategy;
  data: string[];
  interpretation: string;
  risk: string;
  recommendation: string;
  confidence: GrowAgentConfidence;
}
