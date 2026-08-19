import { isSimulatorMode } from '../../config/runtime-mode';
import type { RuntimeService } from '../runtime/runtime-service';
import { parseHomeAssistantNumericState } from './home-assistant-state-parser';
import type { IntegrationsAdvisoryReading } from './integrations-advisory.store';
import type { WorkspaceIntegrationsConfig } from '../../domain/integrations/hub-integration.types';
import { fetchHomeAssistantBoundStates } from './integrations-connection.api';

export interface ExternalSensorReading {
  inputId: string;
  value: number;
  source: 'mqtt' | 'home_assistant';
}

export function readingsFromAdvisory(advisoryReadings: IntegrationsAdvisoryReading[]): ExternalSensorReading[] {
  return advisoryReadings
    .filter((r) => r.value != null)
    .map((r) => ({
      inputId: r.inputId,
      value: r.value as number,
      source: r.source,
    }));
}

export async function pollHomeAssistantBindings(
  config: WorkspaceIntegrationsConfig,
): Promise<IntegrationsAdvisoryReading[]> {
  const ha = config.homeAssistant;
  if (!ha.enabled || !ha.accessToken?.trim() || ha.entityBindings.length === 0) {
    return [];
  }

  const result = await fetchHomeAssistantBoundStates({
    baseUrl: ha.baseUrl,
    accessToken: ha.accessToken,
    entityIds: ha.entityBindings.map((b) => b.entityId),
  });

  if (!result.ok || !result.states) return [];

  const byEntity = new Map(result.states.map((s) => [s.entityId, s]));
  const now = Date.now();

  return ha.entityBindings.flatMap((binding) => {
    const state = byEntity.get(binding.entityId);
    if (!state) return [];
    const value = parseHomeAssistantNumericState(state.state);
    return [
      {
        source: 'home_assistant' as const,
        entityId: binding.entityId,
        deviceId: binding.deviceId,
        inputId: binding.inputId,
        value,
        unit: state.unit,
        receivedAtMs: now,
      },
    ];
  });
}

export function applyExternalReadingsToRuntime(
  runtimeService: RuntimeService,
  readings: ExternalSensorReading[],
): number {
  if (!isSimulatorMode()) return 0;

  let applied = 0;
  for (const reading of readings) {
    if (runtimeService.applyExternalSensorReading(reading.inputId, reading.value)) {
      applied += 1;
    }
  }
  if (applied > 0) {
    runtimeService.refreshView();
  }
  return applied;
}
