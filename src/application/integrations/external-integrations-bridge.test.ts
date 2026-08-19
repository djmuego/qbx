import { describe, expect, it } from 'vitest';
import { readingsFromAdvisory } from './external-integrations-bridge.service';

describe('external-integrations-bridge', () => {
  it('maps advisory readings to sensor inputs', () => {
    const readings = readingsFromAdvisory([
      {
        source: 'mqtt',
        deviceId: 'dev-1',
        inputId: 'in-t',
        value: 22.5,
        receivedAtMs: 1,
      },
      {
        source: 'home_assistant',
        entityId: 'sensor.temp',
        deviceId: 'dev-1',
        inputId: 'in-h',
        value: null,
        receivedAtMs: 2,
      },
    ]);
    expect(readings).toHaveLength(1);
    expect(readings[0]?.inputId).toBe('in-t');
  });
});
