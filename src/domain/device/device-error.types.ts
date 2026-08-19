export type DeviceErrorSeverity = 'info' | 'warning' | 'critical';

export interface DeviceError {
  code: string;
  severity: DeviceErrorSeverity;
  message: string;
  timestampMs: number;
  source?: string;
}
