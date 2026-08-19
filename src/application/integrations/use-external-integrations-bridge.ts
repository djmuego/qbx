import { useEffect } from 'react';
import { isSimulatorMode } from '../../config/runtime-mode';
import type { RuntimeService } from '../runtime/runtime-service';
import { loadIntegrationsConfig } from './hub-integration.store';
import {
  loadIntegrationsAdvisory,
  saveIntegrationsAdvisory,
  type IntegrationsAdvisoryReading,
} from './integrations-advisory.store';
import {
  applyExternalReadingsToRuntime,
  pollHomeAssistantBindings,
  readingsFromAdvisory,
} from './external-integrations-bridge.service';

const POLL_MS = 15_000;

export function useExternalIntegrationsBridge(
  runtimeService: RuntimeService | null,
  workspaceId: string | undefined,
): void {
  useEffect(() => {
    if (!runtimeService || !workspaceId || !isSimulatorMode()) return;

    const run = async () => {
      const config = loadIntegrationsConfig(workspaceId);
      if (!config.simBridgeEnabled) return;

      const advisory = loadIntegrationsAdvisory(workspaceId);
      const mqttReadings = advisory?.readings.filter((r) => r.source === 'mqtt') ?? [];

      let haReadings: IntegrationsAdvisoryReading[] = [];
      try {
        haReadings = await pollHomeAssistantBindings(config);
      } catch {
        haReadings = [];
      }

      saveIntegrationsAdvisory({
        workspaceId,
        updatedAtMs: Date.now(),
        mqttMonitorActive: advisory?.mqttMonitorActive ?? false,
        mqttMappingCount: config.mqtt.topicMappings.length,
        haBindingCount: config.homeAssistant.entityBindings.length,
        haEntityCount: config.homeAssistant.lastDiscovery?.entityCount ?? advisory?.haEntityCount ?? null,
        readings: [...mqttReadings, ...haReadings].slice(-24),
      });

      applyExternalReadingsToRuntime(runtimeService, [
        ...readingsFromAdvisory(mqttReadings),
        ...readingsFromAdvisory(haReadings),
      ]);
    };

    void run();
    const timer = window.setInterval(() => void run(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [runtimeService, workspaceId]);
}
