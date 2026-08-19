import { describe, expect, it } from 'vitest';
import { sanitizeImportedDevices, stripEphemeralDevice } from './export-sanitize';
import { mapLegacyDevice } from './mappers';
import { INITIAL_DEVICES } from '../../mock/seed.runtime';

describe('export/import ephemeral stripping', () => {
  it('export strip drops live telemetry and ONLINE', () => {
    const live = mapLegacyDevice(INITIAL_DEVICES[0]!);
    expect(live.isOnline).toBe(true);
    expect(live.inputs[0]?.currentValue).toBeGreaterThan(0);

    const stripped = stripEphemeralDevice(live);
    expect(stripped.isOnline).toBe(false);
    expect(stripped.status).toBe('offline');
    expect(stripped.inputs.every((s) => s.currentValue === 0 && s.history.length === 0)).toBe(true);
    expect(stripped.outputs.every((o) => o.state === false)).toBe(true);
  });

  it('hardware import stays offline; simulator import is marked virtual-online without readings', () => {
    const live = [mapLegacyDevice(INITIAL_DEVICES[0]!)];
    const hardware = sanitizeImportedDevices(live, 'hardware');
    expect(hardware[0]?.isOnline).toBe(false);
    expect(hardware[0]?.inputs[0]?.currentValue).toBe(0);

    const sim = sanitizeImportedDevices(live, 'simulator');
    expect(sim[0]?.isOnline).toBe(true);
    expect(sim[0]?.inputs[0]?.currentValue).toBe(0);
  });
});
