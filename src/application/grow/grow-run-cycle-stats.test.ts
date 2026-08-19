import { describe, expect, it, vi } from 'vitest';
import { computeGrowRunCycleStats } from './grow-run-telemetry.store';

describe('grow-run cycle stats', () => {
  it('computes averages from samples', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });

    const samples = [
      {
        id: '1',
        growRunId: 'run-1',
        spaceId: 'space-1',
        timestampMs: 1,
        tempC: 20,
        humidityPct: 50,
        vpdKpa: 1,
        soilMoisturePct: null,
        lightOn: null,
        source: 'simulator' as const,
      },
      {
        id: '2',
        growRunId: 'run-1',
        spaceId: 'space-1',
        timestampMs: 2,
        tempC: 24,
        humidityPct: 60,
        vpdKpa: 1.2,
        soilMoisturePct: null,
        lightOn: null,
        source: 'simulator' as const,
      },
    ];
    store.set('qbx_grow_run_telemetry_v1_space-1_run-1', JSON.stringify(samples));

    const stats = computeGrowRunCycleStats('space-1', 'run-1');
    expect(stats.sampleCount).toBe(2);
    expect(stats.tempAvgC).toBe(22);
    expect(stats.tempMinC).toBe(20);
    expect(stats.tempMaxC).toBe(24);

    vi.unstubAllGlobals();
  });
});
