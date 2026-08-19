import type { GrowAgentConfidence } from '../ai/grow-agent-response.types';

export type PredictionKind =
  | 'time_to_temperature_limit'
  | 'time_to_humidity_limit'
  | 'time_to_dry_threshold'
  | 'time_to_dli_target'
  | 'time_to_tank_empty';

export interface Prediction {
  id: string;
  kind: PredictionKind;
  title: string;
  estimateMinutes?: number;
  estimateText: string;
  confidence: GrowAgentConfidence;
  basis: string[];
}
