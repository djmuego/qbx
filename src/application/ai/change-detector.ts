import type { GrowContext } from '../../domain/ai/grow-context.types';

export interface ChangeDetectorConfig {
  enabled: boolean;
  minIntervalMs: number;
  healthCheckIntervalMs: number;
}

export const DEFAULT_CHANGE_DETECTOR_CONFIG: ChangeDetectorConfig = {
  enabled: true,
  minIntervalMs: 5 * 60_000,
  healthCheckIntervalMs: 45 * 60_000,
};

export interface ChangeDetectorState {
  lastAnalysisMs: number;
  lastContextHash: string;
}

export function hashGrowContext(context: GrowContext): string {
  const key = [
    context.meta.capturedAtMs,
    context.dataQuality.hasLiveSensorData,
    context.alerts.emergencyActive,
    context.environment.sensors.map((s) => `${s.id}:${s.value}:${s.quality}`).join('|'),
    context.equipment.map((e) => `${e.outputId}:${e.reportedState}:${e.controlMode}`).join('|'),
    context.recentEvents.length,
  ].join(';');
  return key;
}

export function shouldTriggerAnalysis(
  context: GrowContext,
  state: ChangeDetectorState | null,
  config: ChangeDetectorConfig = DEFAULT_CHANGE_DETECTOR_CONFIG,
  nowMs = Date.now(),
): boolean {
  if (!config.enabled) return false;
  if (!state) return true;
  if (nowMs - state.lastAnalysisMs < config.minIntervalMs) return false;

  if (context.alerts.emergencyActive) return true;
  if (context.dataQuality.staleSensors.length > 0) return true;
  if (context.dataQuality.offlineDevices > 0) return true;

  const temp = context.environment.sensors.find((s) => s.type === 'temperature' && s.value != null);
  if (temp && temp.optimalMax != null && temp.value! > temp.optimalMax) return true;

  const hash = hashGrowContext(context);
  return hash !== state.lastContextHash;
}

export function shouldRunHealthCheck(
  state: ChangeDetectorState | null,
  config: ChangeDetectorConfig = DEFAULT_CHANGE_DETECTOR_CONFIG,
  nowMs = Date.now(),
): boolean {
  if (!config.enabled || !state) return false;
  return nowMs - state.lastAnalysisMs >= config.healthCheckIntervalMs;
}
