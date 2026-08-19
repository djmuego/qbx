/** Registry of external hub connectors — health-check vs live transport status. */

export type HubConnectorKind = 'qbx-native' | 'mqtt' | 'home-assistant' | 'tuya';

export type HubConnectorStatus = 'deferred' | 'draft' | 'health-check' | 'discovery' | 'live';

export interface HubConnectorDescriptor {
  kind: HubConnectorKind;
  label: string;
  status: HubConnectorStatus;
  description: string;
}

export const EXTERNAL_HUB_CONNECTORS: HubConnectorDescriptor[] = [
  {
    kind: 'qbx-native',
    label: 'QBX Zigbee Hub',
    status: 'deferred',
    description: 'Branded hub — Pass 3 deferred until hardware arrives.',
  },
  {
    kind: 'mqtt',
    label: 'MQTT Broker',
    status: 'live',
    description: 'TCP health check + dev-server topic monitor + topic→device mapping (advisory only).',
  },
  {
    kind: 'home-assistant',
    label: 'Home Assistant',
    status: 'discovery',
    description: 'API health check + entity discovery + auto-poll states (advisory). No auto-control.',
  },
  {
    kind: 'tuya',
    label: 'Tuya Cloud',
    status: 'health-check',
    description: 'Cloud token health check. Device mapping ships after hub transport.',
  },
];

export function connectorByKind(kind: HubConnectorKind): HubConnectorDescriptor | undefined {
  return EXTERNAL_HUB_CONNECTORS.find((c) => c.kind === kind);
}
