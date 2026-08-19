import { describe, expect, it } from 'vitest';
import { mapMqttMessage, matchMqttTopic, parseMqttPayloadValue } from './mqtt-topic-mapper';

describe('mqtt-topic-mapper', () => {
  it('matches mqtt wildcards', () => {
    expect(matchMqttTopic('qbx/+/temp', 'qbx/grow-1/temp')).toBe(true);
    expect(matchMqttTopic('qbx/+/temp', 'qbx/grow-1/humidity')).toBe(false);
    expect(matchMqttTopic('qbx/#', 'qbx/grow-1/temp')).toBe(true);
  });

  it('parses json and numeric payloads', () => {
    expect(parseMqttPayloadValue('24.5')).toBe(24.5);
    expect(parseMqttPayloadValue('{"value":55}')).toBe(55);
    expect(parseMqttPayloadValue('offline')).toBeNull();
  });

  it('maps topic to device input', () => {
    const reading = mapMqttMessage(
      'qbx/space-1/temp',
      '23.1',
      1000,
      [{ id: 'm1', topicPattern: 'qbx/+/temp', deviceId: 'dev-1', inputId: 'in-t' }],
    );
    expect(reading?.deviceId).toBe('dev-1');
    expect(reading?.value).toBe(23.1);
  });
});
