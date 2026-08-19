import type { MqttTopicMapping } from './mqtt-topic-mapping.types';

export type HubIntegrationKind = 'mqtt' | 'home_assistant' | 'tuya' | 'qbx_zigbee';

export interface MqttIntegrationConfig {
  enabled: boolean;
  brokerUrl: string;
  port: number;
  topicPrefix: string;
  useTls: boolean;
  topicMappings: MqttTopicMapping[];
}

export interface HomeAssistantDiscoverySnapshot {
  entityCount: number;
  domainCounts: Record<string, number>;
  sampleEntities: string[];
  discoveredAt: string;
}

export interface HomeAssistantIntegrationConfig {
  enabled: boolean;
  baseUrl: string;
  /** Long-lived access token — stored locally / workspace payload only */
  accessToken?: string;
  lastDiscovery?: HomeAssistantDiscoverySnapshot;
}

export interface TuyaIntegrationConfig {
  enabled: boolean;
  region: string;
}

export interface QbxZigbeeIntegrationConfig {
  enabled: boolean;
  note: string;
}

export interface WorkspaceIntegrationsConfig {
  schemaVersion: 1;
  mqtt: MqttIntegrationConfig;
  homeAssistant: HomeAssistantIntegrationConfig;
  tuya: TuyaIntegrationConfig;
  qbxZigbee: QbxZigbeeIntegrationConfig;
}

export function defaultIntegrationsConfig(): WorkspaceIntegrationsConfig {
  return {
    schemaVersion: 1,
    mqtt: { enabled: false, brokerUrl: '', port: 1883, topicPrefix: 'qbx/', useTls: false, topicMappings: [] },
    homeAssistant: { enabled: false, baseUrl: '', accessToken: '' },
    tuya: { enabled: false, region: 'eu' },
    qbxZigbee: { enabled: false, note: '' },
  };
}
