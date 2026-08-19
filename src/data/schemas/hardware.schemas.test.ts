import { describe, expect, it } from 'vitest';
import {
  deviceCapabilitiesSchema,
  deviceSnapshotSchema,
  parseCommandResult,
} from '../../data/schemas/hardware.schemas';

describe('hardware schemas', () => {
  it('validates device capabilities from untrusted input', () => {
    const parsed = deviceCapabilitiesSchema.parse({
      deviceId: 'dev-1',
      outputs: [{ id: 'out_1', channel: '1', type: 'switch' }],
      sensorInputs: [{ id: 'in_1', channel: '1', type: 'temperature', unit: '°C' }],
      interfaces: ['wifi'],
      features: ['relay'],
    });
    expect(parsed.outputs).toHaveLength(1);
  });

  it('validates device snapshot', () => {
    const parsed = deviceSnapshotSchema.parse({
      deviceId: 'dev-1',
      timestampMs: Date.now(),
      connection: 'online',
      sensors: [],
      outputs: [{ outputId: 'out_1', state: 'off', timestampMs: Date.now() }],
      errors: [],
    });
    expect(parsed.connection).toBe('online');
  });

  it('parses failed command result', () => {
    const parsed = parseCommandResult({
      commandId: 'cmd-1',
      status: 'failed',
      timestampMs: 1,
      error: 'offline',
    });
    expect(parsed.status).toBe('failed');
  });
});
