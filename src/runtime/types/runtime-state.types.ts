import type { ControlMode } from '../../domain/equipment/equipment.types';
import type { SensorType } from '../../domain/sensor/sensor.types';
import type { AutomationRuntimeStatus } from '../../domain/automation/automation.types';

export type SensorQuality = 'ok' | 'stale' | 'error';

export interface SensorReading {
  sensorId: string;
  deviceId: string;
  spaceId: string;
  type: SensorType;
  value: number;
  unit: string;
  timestampMs: number;
  quality: SensorQuality;
  optimalMin: number;
  optimalMax: number;
}

export interface OutputRuntimeState {
  outputId: string;
  deviceId: string;
  spaceId: string;
  /** Reported physical state from device/gateway */
  state: boolean;
  desiredState: boolean;
  reportedState: boolean;
  commandStatus?: 'idle' | 'pending' | 'acknowledged' | 'failed' | 'timeout';
  controlMode: ControlMode;
  safeState: 'off';
  maxContinuousOnSeconds?: number;
  onSinceMs: number | null;
  controllingAutomationId?: string;
  controllingAutomationName?: string;
}

export interface TimerRuntimeState {
  automationId: string;
  nextTriggerMs: number;
  activeUntilMs: number | null;
}

export interface AutomationRuntimeState {
  automationId: string;
  runtimeStatus: AutomationRuntimeStatus;
  lastError?: string;
}

export interface SpaceRuntimeState {
  spaceId: string;
  emergencyActive: boolean;
}

export interface RuntimeSnapshot {
  sensorReadings: Record<string, SensorReading>;
  outputStates: Record<string, OutputRuntimeState>;
  automationStates: Record<string, AutomationRuntimeState>;
  timerStates: Record<string, TimerRuntimeState>;
  spaceStates: Record<string, SpaceRuntimeState>;
}

export const STALE_SENSOR_MS = 30_000;

export const DEFAULT_EVENT_LOG_LIMIT = 1000;

export const DEFAULT_HISTORY_LIMIT = 2880;
