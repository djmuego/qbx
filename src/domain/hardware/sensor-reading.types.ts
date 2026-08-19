import type { SensorType } from '../sensor/sensor.types';

export type SensorQuality = 'ok' | 'stale' | 'error';

export interface SensorReadingBoundary {
  sensorId: string;
  value: number;
  unit: string;
  timestampMs: number;
  quality: SensorQuality;
  type?: SensorType;
}
