import type { MqttTopicMapping } from '../../domain/integrations/mqtt-topic-mapping.types';

export interface MqttConnectionTestResult {
  ok: boolean;
  host?: string;
  port?: number;
  latencyMs?: number;
  note?: string;
  error?: string;
}

export interface MqttBridgeStatusResult {
  active: boolean;
  connected: boolean;
  brokerHost: string;
  port: number;
  topicFilter: string;
  messageCount: number;
  lastError: string | null;
  lastMessageAtMs: number | null;
}

export interface MqttBridgeMessageResult {
  topic: string;
  payload: string;
  receivedAtMs: number;
  mapped?: {
    mappingId: string;
    deviceId: string;
    inputId: string;
    value: number | null;
    unit?: string;
  };
}

export interface HomeAssistantTestResult {
  ok: boolean;
  version?: string;
  latencyMs?: number;
  error?: string;
}

export interface HomeAssistantEntitiesResult {
  ok: boolean;
  entityCount?: number;
  domainCounts?: Record<string, number>;
  sampleEntities?: string[];
  latencyMs?: number;
  error?: string;
}

export async function testMqttBrokerConnection(input: {
  brokerUrl: string;
  port: number;
}): Promise<MqttConnectionTestResult> {
  const response = await fetch('/api/integrations/mqtt/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await response.json()) as MqttConnectionTestResult;
}

export async function startMqttTopicMonitor(input: {
  brokerUrl: string;
  port: number;
  topicPrefix: string;
  useTls?: boolean;
  topicMappings?: MqttTopicMapping[];
}): Promise<{ ok: boolean; status?: MqttBridgeStatusResult; error?: string }> {
  const response = await fetch('/api/integrations/mqtt/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await response.json()) as { ok: boolean; status?: MqttBridgeStatusResult; error?: string };
}

export async function stopMqttTopicMonitor(): Promise<{ ok: boolean }> {
  const response = await fetch('/api/integrations/mqtt/unsubscribe', { method: 'POST' });
  return (await response.json()) as { ok: boolean };
}

export async function fetchMqttBridgeStatus(): Promise<MqttBridgeStatusResult> {
  const response = await fetch('/api/integrations/mqtt/status');
  return (await response.json()) as MqttBridgeStatusResult;
}

export async function fetchMqttBridgeMessages(
  limit = 20,
): Promise<{ messages: MqttBridgeMessageResult[] }> {
  const response = await fetch(`/api/integrations/mqtt/messages?limit=${limit}`);
  return (await response.json()) as { messages: MqttBridgeMessageResult[] };
}

export async function testHomeAssistantConnection(input: {
  baseUrl: string;
  accessToken: string;
}): Promise<HomeAssistantTestResult> {
  const response = await fetch('/api/integrations/home-assistant/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await response.json()) as HomeAssistantTestResult;
}

export async function fetchHomeAssistantEntities(input: {
  baseUrl: string;
  accessToken: string;
}): Promise<HomeAssistantEntitiesResult> {
  const response = await fetch('/api/integrations/home-assistant/entities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await response.json()) as HomeAssistantEntitiesResult;
}
