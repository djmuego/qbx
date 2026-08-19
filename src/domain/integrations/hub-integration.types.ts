export type HubIntegrationKind = 'mqtt' | 'home_assistant' | 'tuya' | 'qbx_zigbee';

export interface MqttIntegrationConfig {
  enabled: boolean;
  brokerUrl: string;
  port: number;
  topicPrefix: string;
  useTls: boolean;
}

export interface HomeAssistantIntegrationConfig {
  enabled: boolean;
  baseUrl: string;
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
    mqtt: { enabled: false, brokerUrl: '', port: 1883, topicPrefix: 'qbx/', useTls: false },
    homeAssistant: { enabled: false, baseUrl: '' },
    tuya: { enabled: false, region: 'eu' },
    qbxZigbee: { enabled: false, note: '' },
  };
}
