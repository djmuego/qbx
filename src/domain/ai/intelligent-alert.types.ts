export type IntelligentAlertType =
  | 'threshold_deviation'
  | 'rapid_change'
  | 'sensor_stale'
  | 'sensor_offline'
  | 'device_offline'
  | 'automation_conflict'
  | 'unexpected_equipment_state'
  | 'prolonged_output_activity'
  | 'vpd_deviation'
  | 'co2_deviation'
  | 'substrate_dryback_anomaly';

export type IntelligentAlertSeverity = 'info' | 'warning' | 'critical';

export interface IntelligentAlert {
  id: string;
  type: IntelligentAlertType;
  severity: IntelligentAlertSeverity;
  title: string;
  message: string;
  evidence: string[];
  trendSummary?: string;
  sensorId?: string;
  deviceId?: string;
}
