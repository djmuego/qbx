export interface IntegrationsAdvisoryReading {
  source: 'mqtt' | 'home_assistant';
  topic?: string;
  entityId?: string;
  deviceId: string;
  inputId: string;
  value: number | null;
  unit?: string;
  receivedAtMs: number;
}

export interface IntegrationsAdvisorySnapshot {
  workspaceId: string;
  updatedAtMs: number;
  mqttMonitorActive: boolean;
  mqttMappingCount: number;
  haBindingCount: number;
  haEntityCount: number | null;
  readings: IntegrationsAdvisoryReading[];
}

const KEY_PREFIX = 'qbx_integrations_advisory_v1';

function storageKey(workspaceId: string): string {
  return `${KEY_PREFIX}_${workspaceId}`;
}

export function loadIntegrationsAdvisory(workspaceId: string): IntegrationsAdvisorySnapshot | null {
  if (!workspaceId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    return raw ? (JSON.parse(raw) as IntegrationsAdvisorySnapshot) : null;
  } catch {
    return null;
  }
}

export function saveIntegrationsAdvisory(snapshot: IntegrationsAdvisorySnapshot): void {
  if (!snapshot.workspaceId || typeof window === 'undefined') return;
  localStorage.setItem(storageKey(snapshot.workspaceId), JSON.stringify(snapshot));
}
