import type { MqttMappedReading, MqttTopicMapping } from '../../domain/integrations/mqtt-topic-mapping.types';

function escapeRegex(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match MQTT topic against pattern (`+` = one level, `#` = suffix wildcard). */
export function matchMqttTopic(pattern: string, topic: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed) return false;
  if (trimmed.endsWith('#')) {
    const prefix = trimmed.slice(0, -1);
    return topic.startsWith(prefix);
  }
  const parts = trimmed.split('/');
  const regex = new RegExp(
    '^' +
      parts
        .map((seg) => (seg === '+' ? '[^/]+' : escapeRegex(seg)))
        .join('/') +
      '$',
  );
  return regex.test(topic);
}

export function parseMqttPayloadValue(payload: string): number | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;
  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    const candidate = json.value ?? json.temperature ?? json.humidity ?? json.state;
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string') {
      const n = Number(candidate);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    // plain number string
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function mapMqttMessage(
  topic: string,
  payload: string,
  receivedAtMs: number,
  mappings: MqttTopicMapping[],
): MqttMappedReading | null {
  for (const mapping of mappings) {
    if (!matchMqttTopic(mapping.topicPattern, topic)) continue;
    return {
      mappingId: mapping.id,
      topic,
      deviceId: mapping.deviceId,
      inputId: mapping.inputId,
      label: mapping.label,
      value: parseMqttPayloadValue(payload),
      unit: mapping.unit,
      receivedAtMs,
    };
  }
  return null;
}

export function mapRecentMqttMessages(
  messages: Array<{ topic: string; payload: string; receivedAtMs: number }>,
  mappings: MqttTopicMapping[],
): MqttMappedReading[] {
  const readings: MqttMappedReading[] = [];
  for (const message of messages) {
    const mapped = mapMqttMessage(message.topic, message.payload, message.receivedAtMs, mappings);
    if (mapped) readings.push(mapped);
  }
  return readings;
}
