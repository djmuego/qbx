import type { GrowStageId } from './grow-stage.types';
import type { GrowRun, GrowRunStatus } from './grow-run.types';

export interface GrowRunTelemetrySample {
  id: string;
  growRunId: string;
  spaceId: string;
  timestampMs: number;
  tempC: number | null;
  humidityPct: number | null;
  vpdKpa: number | null;
  soilMoisturePct: number | null;
  lightOn: boolean | null;
  source: 'runtime' | 'simulator';
}

export interface GrowRunTelemetrySummary {
  growRunId: string;
  sampleCount: number;
  firstSampleAt: number | null;
  lastSampleAt: number | null;
}

export interface StartGrowRunInput {
  cropId: string;
  commonName: string;
  cultivar?: string;
  stage: GrowStageId;
  notes?: string;
}

export type { GrowRun, GrowRunStatus };
