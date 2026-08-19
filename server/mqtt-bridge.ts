import mqtt, { type MqttClient } from 'mqtt';
import { mapMqttMessage } from '../src/application/integrations/mqtt-topic-mapper';
import type { MqttTopicMapping } from '../src/domain/integrations/mqtt-topic-mapping.types';
import { parseBrokerHost } from './integration-proxy-utils';

export interface MqttBridgeMessage {
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

export interface MqttBridgeStatus {
  active: boolean;
  connected: boolean;
  brokerHost: string;
  port: number;
  topicFilter: string;
  messageCount: number;
  lastError: string | null;
  lastMessageAtMs: number | null;
}

interface MqttBridgeSession {
  client: MqttClient;
  brokerHost: string;
  port: number;
  topicFilter: string;
  messages: MqttBridgeMessage[];
  lastError: string | null;
  topicMappings: MqttTopicMapping[];
}

const MAX_MESSAGES = 100;

let session: MqttBridgeSession | null = null;

function buildBrokerUrl(host: string, port: number, useTls: boolean): string {
  const protocol = useTls ? 'mqtts' : 'mqtt';
  return `${protocol}://${host}:${port}`;
}

export function getMqttBridgeStatus(): MqttBridgeStatus {
  if (!session) {
    return {
      active: false,
      connected: false,
      brokerHost: '',
      port: 0,
      topicFilter: '',
      messageCount: 0,
      lastError: null,
      lastMessageAtMs: null,
    };
  }
  const last = session.messages[session.messages.length - 1];
  return {
    active: true,
    connected: session.client.connected,
    brokerHost: session.brokerHost,
    port: session.port,
    topicFilter: session.topicFilter,
    messageCount: session.messages.length,
    lastError: session.lastError,
    lastMessageAtMs: last?.receivedAtMs ?? null,
  };
}

export function getMqttBridgeMessages(limit = 20): MqttBridgeMessage[] {
  if (!session) return [];
  return session.messages.slice(-Math.min(Math.max(limit, 1), MAX_MESSAGES));
}

export function stopMqttBridge(): void {
  if (!session) return;
  session.client.removeAllListeners();
  session.client.end(true);
  session = null;
}

export function startMqttBridge(input: {
  brokerUrl: string;
  port: number;
  topicPrefix: string;
  useTls?: boolean;
  topicMappings?: MqttTopicMapping[];
}): Promise<MqttBridgeStatus> {
  stopMqttBridge();

  const host = parseBrokerHost(input.brokerUrl);
  const port = Number(input.port) || 1883;
  if (!host) {
    return Promise.reject(new Error('brokerUrl required'));
  }

  const topicPrefix = input.topicPrefix.trim() || 'qbx/';
  const topicFilter = topicPrefix.endsWith('/') ? `${topicPrefix}#` : `${topicPrefix}/#`;
  const url = buildBrokerUrl(host, port, Boolean(input.useTls));

  const topicMappings = input.topicMappings ?? [];

  return new Promise((resolve, reject) => {
    const messages: MqttBridgeMessage[] = [];
    let settled = false;

    const client = mqtt.connect(url, {
      reconnectPeriod: 0,
      connectTimeout: 8000,
    });

    const fail = (error: string) => {
      client.removeAllListeners();
      client.end(true);
      session = null;
      if (!settled) {
        settled = true;
        reject(new Error(error));
      }
    };

    const timer = setTimeout(() => fail('MQTT connect timeout'), 9000);

    client.on('connect', () => {
      client.subscribe(topicFilter, (err) => {
        clearTimeout(timer);
        if (err) {
          fail(err.message);
          return;
        }
        session = {
          client,
          brokerHost: host,
          port,
          topicFilter,
          messages,
          lastError: null,
          topicMappings,
        };
        if (!settled) {
          settled = true;
          resolve(getMqttBridgeStatus());
        }
      });
    });

    client.on('message', (topic, payload) => {
      if (!session) return;
      const payloadStr = payload.toString('utf8').slice(0, 512);
      const receivedAtMs = Date.now();
      const mapped = mapMqttMessage(topic, payloadStr, receivedAtMs, session.topicMappings);
      const entry: MqttBridgeMessage = {
        topic,
        payload: payloadStr,
        receivedAtMs,
        mapped: mapped
          ? {
              mappingId: mapped.mappingId,
              deviceId: mapped.deviceId,
              inputId: mapped.inputId,
              value: mapped.value,
              unit: mapped.unit,
            }
          : undefined,
      };
      session.messages.push(entry);
      if (session.messages.length > MAX_MESSAGES) {
        session.messages.shift();
      }
    });

    client.on('error', (err) => {
      if (session) session.lastError = err.message;
      if (!settled) fail(err.message);
    });
  });
}
