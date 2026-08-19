import type { GrowStageId } from './grow-stage.types';

export type GrowRunStatus = 'active' | 'completed' | 'archived';

export interface GrowRun {
  id: string;
  spaceId: string;
  cropId: string;
  commonName: string;
  cultivar?: string;
  stage: GrowStageId;
  startedAt: string;
  endedAt?: string;
  status: GrowRunStatus;
  notes?: string;
}

export interface GrowOutcome {
  growRunId: string;
  yield?: string;
  quality?: string;
  durationDays?: number;
  waterUse?: string;
  energyUse?: string;
  nutrientUse?: string;
  issues?: string[];
  losses?: string;
  resourceUseNotes?: string;
  notes?: string;
  recordedAt?: string;
}
