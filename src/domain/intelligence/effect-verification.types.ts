export type EffectVerificationResult = 'effective' | 'partiallyEffective' | 'ineffective' | 'unknown';

export interface EffectVerification {
  actionId: string;
  equipmentRole: string;
  commandedAtMs: number;
  observedAtMs: number;
  result: EffectVerificationResult;
  metric: string;
  beforeValue?: number;
  afterValue?: number;
  trendChanged: boolean;
  evidence: string[];
  notes?: string;
}

export interface EquipmentEffectProfile {
  spaceId: string;
  equipmentRole: string;
  typicalEffect?: string;
  typicalLagMinutes?: number;
  sampleCount: number;
  lastUpdatedMs?: number;
  source: 'grow_run_observation' | 'manual';
}
