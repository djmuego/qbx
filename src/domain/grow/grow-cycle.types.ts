import type { GrowOutcome } from './grow-run.types';
import type { GrowProfile } from './grow-profile.types';

/** Full grow cycle: culture → harvest → learn */
export interface GrowCycle {
  id: string;
  spaceId: string;
  profile: GrowProfile;
  blueprintId?: string;
  startedAt: string;
  currentDay: number;
  currentStageId: string;
  status: 'active' | 'paused' | 'completed' | 'aborted';
  outcome?: GrowOutcome;
}

/** QBX Blueprint — recipe per stage (Growlink-style) */
export interface GrowBlueprint {
  id: string;
  cropId: string;
  name: string;
  version: number;
  stages: GrowBlueprintStage[];
  source: 'catalog' | 'user' | 'learned';
}

export interface GrowBlueprintStage {
  stageId: string;
  dayRange?: { from: number; to?: number };
  targets: GrowProfile['targets'];
  irrigationStrategy?: 'dryback' | 'maintenance' | 'generative' | 'vegetative';
  lightingStrategy?: string;
  notes?: string;
}

export interface GrowBlueprintRepository {
  list(cropId?: string): Promise<GrowBlueprint[]>;
  get(id: string): Promise<GrowBlueprint | null>;
  save(blueprint: GrowBlueprint): Promise<void>;
}

/** Compare cycles for learning (Grow #12 vs #15) */
export interface GrowCycleComparison {
  runIds: string[];
  summary: string;
  climateDelta?: string;
  irrigationDelta?: string;
  healthScoreDelta?: number;
  learnedHints?: string[];
}
