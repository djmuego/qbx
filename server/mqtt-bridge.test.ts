import { describe, expect, it } from 'vitest';
import { getMqttBridgeMessages, getMqttBridgeStatus, stopMqttBridge } from './mqtt-bridge';

describe('mqtt-bridge', () => {
  it('returns idle status when no session', () => {
    stopMqttBridge();
    const status = getMqttBridgeStatus();
    expect(status.active).toBe(false);
    expect(getMqttBridgeMessages()).toEqual([]);
  });
});
