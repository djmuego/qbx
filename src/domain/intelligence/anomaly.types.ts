export type AnomalyKind =
  | 'sensor_disagreement'
  | 'sensor_stuck'
  | 'impossible_jump'
  | 'rapid_drift'
  | 'device_no_effect'
  | 'irrigation_no_response'
  | 'fan_no_effect'
  | 'heater_no_effect'
  | 'light_schedule_mismatch'
  | 'automation_cycling'
  | 'excessive_relay_switching'
  | 'sensor_stale'
  | 'device_intermittent'
  | 'co2_vent_conflict'
  | 'strategy_conflict';

export interface AnomalyFinding {
  id: string;
  kind: AnomalyKind;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  evidence: string[];
  possibleCauses?: string[];
  requiresUserAction: boolean;
}
