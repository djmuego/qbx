import type { GrowPhaseId } from '../grow/grow-phase.types';

export interface SpaceSetupBrief {
  spaceName: string;
  cropOrGoal: string;
  roomDescription?: string;
  currentPhaseHint?: string;
}

export interface AdvisorTargets {
  temperature: string;
  humidity: string;
  lightCycle: string;
  soilMoisture?: string;
  co2?: string;
}

export interface SpaceAdvisorRecommendation {
  growPhase: GrowPhaseId;
  spaceNameSuggestion: string;
  spaceDescription: string;
  targets: AdvisorTargets;
  criteria: string[];
  nextSteps: string[];
  automationHints: string[];
  summary: string;
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
