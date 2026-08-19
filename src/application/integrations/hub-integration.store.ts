import type { WorkspaceIntegrationsConfig } from '../../domain/integrations/hub-integration.types';
import { defaultIntegrationsConfig } from '../../domain/integrations/hub-integration.types';
import {
  cloudLoadIntegrationsConfig,
  cloudSaveIntegrationsConfig,
} from './integrations-cloud.persistence';

const KEY_PREFIX = 'qbx_hub_integrations_v1';

function storageKey(workspaceId: string): string {
  return `${KEY_PREFIX}_${workspaceId}`;
}

export function loadIntegrationsConfig(workspaceId: string): WorkspaceIntegrationsConfig {
  if (!workspaceId || typeof window === 'undefined') return defaultIntegrationsConfig();
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return defaultIntegrationsConfig();
    const defaults = defaultIntegrationsConfig();
    const parsed = JSON.parse(raw) as WorkspaceIntegrationsConfig;
    return {
      ...defaults,
      ...parsed,
      mqtt: {
        ...defaults.mqtt,
        ...parsed.mqtt,
        topicMappings: parsed.mqtt?.topicMappings ?? defaults.mqtt.topicMappings,
      },
      homeAssistant: { ...defaults.homeAssistant, ...parsed.homeAssistant },
    };
  } catch {
    return defaultIntegrationsConfig();
  }
}

export function saveIntegrationsConfig(workspaceId: string, config: WorkspaceIntegrationsConfig): void {
  if (!workspaceId || typeof window === 'undefined') return;
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(config));
  void cloudSaveIntegrationsConfig(config);
}

export async function hydrateIntegrationsFromCloud(workspaceId: string): Promise<WorkspaceIntegrationsConfig> {
  const local = loadIntegrationsConfig(workspaceId);
  const cloud = await cloudLoadIntegrationsConfig();
  if (!cloud) return local;
  const merged = { ...defaultIntegrationsConfig(), ...local, ...cloud };
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(merged));
  }
  return merged;
}
