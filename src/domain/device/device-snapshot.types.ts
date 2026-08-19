import type { ConnectionState } from './device-lifecycle.types';
import type { OutputState } from '../hardware/output-state.types';
import type { SensorReadingBoundary } from '../hardware/sensor-reading.types';
import type { DeviceError } from './device-error.types';

export interface DeviceSnapshot {
  deviceId: string;
  timestampMs: number;
  connection: ConnectionState;
  sensors: SensorReadingBoundary[];
  outputs: OutputState[];
  errors: DeviceError[];
}
