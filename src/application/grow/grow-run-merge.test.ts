import { describe, expect, it } from 'vitest';
import type { GrowRun } from '../../domain/grow/grow-run.types';
import { mergeGrowRunTelemetry, mergeGrowRuns } from './grow-run-merge';

function run(partial: Partial<GrowRun> & Pick<GrowRun, 'id' | 'startedAt'>): GrowRun {
  return {
    spaceId: 'space-1',
    cropId: 'lettuce',
    commonName: 'Lettuce',
    stage: 'vegetative',
    status: 'active',
    ...partial,
  };
}

describe('grow-run merge', () => {
  it('prefers newer cycle record and sorts by startedAt desc', () => {
    const local = [
      run({ id: 'a', startedAt: '2026-08-01T00:00:00.000Z', status: 'active' }),
      run({ id: 'b', startedAt: '2026-08-10T00:00:00.000Z', status: 'completed', endedAt: '2026-08-12T00:00:00.000Z' }),
    ];
    const cloud = [
      run({ id: 'a', startedAt: '2026-08-01T00:00:00.000Z', status: 'completed', endedAt: '2026-08-03T00:00:00.000Z' }),
      run({ id: 'c', startedAt: '2026-08-15T00:00:00.000Z', status: 'active' }),
    ];
    const merged = mergeGrowRuns(local, cloud);
    expect(merged.map((r) => r.id)).toEqual(['c', 'b', 'a']);
    expect(merged.find((r) => r.id === 'a')?.status).toBe('completed');
  });

  it('unions telemetry samples by id', () => {
    const merged = mergeGrowRunTelemetry(
      [
        {
          id: '1',
          growRunId: 'r',
          spaceId: 's',
          timestampMs: 2,
          tempC: 22,
          humidityPct: null,
          vpdKpa: null,
          soilMoisturePct: null,
          lightOn: null,
          source: 'runtime',
        },
      ],
      [
        {
          id: '0',
          growRunId: 'r',
          spaceId: 's',
          timestampMs: 1,
          tempC: 20,
          humidityPct: null,
          vpdKpa: null,
          soilMoisturePct: null,
          lightOn: null,
          source: 'runtime',
        },
        {
          id: '1',
          growRunId: 'r',
          spaceId: 's',
          timestampMs: 2,
          tempC: 21,
          humidityPct: null,
          vpdKpa: null,
          soilMoisturePct: null,
          lightOn: null,
          source: 'runtime',
        },
      ],
    );
    expect(merged.map((s) => s.id)).toEqual(['0', '1']);
    expect(merged[1]?.tempC).toBe(22);
  });
});
