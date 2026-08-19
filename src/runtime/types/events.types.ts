export type RuntimeEventType =
  | 'SENSOR_READING'
  | 'OUTPUT_ON'
  | 'OUTPUT_OFF'
  | 'MANUAL_OVERRIDE'
  | 'AUTO_RESTORED'
  | 'AUTOMATION_TRIGGERED'
  | 'AUTOMATION_STOPPED'
  | 'AUTOMATION_ERROR'
  | 'DEVICE_ONLINE'
  | 'DEVICE_OFFLINE'
  | 'EMERGENCY_OFF'
  | 'EMERGENCY_RELEASED'
  | 'OUTPUT_SAFETY_TIMEOUT'
  | 'COMMAND_FAILED';

export interface RuntimeEvent {
  id: string;
  type: RuntimeEventType;
  timestampMs: number;
  spaceId?: string;
  deviceId?: string;
  sensorId?: string;
  outputId?: string;
  automationId?: string;
  message: string;
  payload?: Record<string, unknown>;
}
