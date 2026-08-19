import { describe, expect, it } from 'vitest';
import { normalizeBaseUrl, parseBrokerHost } from './integration-proxy-utils';

describe('integration-proxy-utils', () => {
  it('parses mqtt broker host from url', () => {
    expect(parseBrokerHost('mqtt://broker.local:1883')).toBe('broker.local');
    expect(parseBrokerHost('192.168.1.10')).toBe('192.168.1.10');
  });

  it('normalizes homeassistant base url', () => {
    expect(normalizeBaseUrl('homeassistant.local:8123')).toBe('http://homeassistant.local:8123');
    expect(normalizeBaseUrl('https://ha.example.com/')).toBe('https://ha.example.com');
  });
});
