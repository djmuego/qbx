import type { GrowStageId } from '../grow/grow-stage.types';
import type { GrowMedium } from '../grow/crop-profile.types';

export interface StageTargetSet {
  stageId: GrowStageId;
  durationEstimateDays?: { min?: number; max?: number };
  environmentTargets?: Record<string, { min?: number; max?: number; unit: string }>;
  lightingTargets?: { photoperiodHours?: number; dli?: { min?: number; max?: number } };
  rootZoneTargets?: Record<string, { min?: number; max?: number; unit: string }>;
  nutritionTargets?: { ec?: { min?: number; max?: number }; ph?: { min?: number; max?: number } };
  transitionSignals?: string[];
  requiredObservations?: string[];
  notes?: string;
}

/** Generic crop library entry — scales to thousands via knowledge + generated JSON */
export interface CropLibraryProfile {
  cropId: string;
  commonName: string;
  scientificName?: string;
  taxonomy?: string;
  cultivars?: string[];
  applicableStages: GrowStageId[];
  defaultMediums: GrowMedium[];
  growthStages: StageTargetSet[];
  stressIndicators?: string[];
  commonDiseases?: string[];
  commonPests?: string[];
  recommendedSensors?: string[];
  automationTemplateIds?: string[];
  sourceIds?: string[];
}
