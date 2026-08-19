import { describe, expect, it } from 'vitest';
import { buildSpatialContext } from './build-spatial-context';
import type { SpaceMap } from '../../domain/map/space-map.types';

describe('buildSpatialContext', () => {
  it('summarizes plants and devices', () => {
    const map: SpaceMap = {
      spaceId: 's1',
      schemaVersion: 1,
      gridStepM: 0.1,
      northOffsetDeg: 0,
      placements: [
        { id: 'p1', kind: 'plant', plantId: 'pl1', xM: 1, yM: 1, widthM: 0.3, heightM: 0.3, rotationDeg: 0 },
        { id: 'l1', kind: 'light', xM: 2, yM: 2, widthM: 0.4, heightM: 0.4, rotationDeg: 0, label: 'Свет 1' },
      ],
      zones: [],
      updatedAt: new Date().toISOString(),
    };
    const ctx = buildSpatialContext({
      space: { id: 's1', name: 'Box', type: 'grow_box', dimensions: { lengthM: 4, widthM: 4, heightM: 2 } },
      map,
      plants: [{ id: 'pl1', spaceId: 's1', name: 'Tomato', plantedAt: '2026-08-01' }],
      devices: [],
    });
    expect(ctx.summary.plantCount).toBe(1);
    expect(ctx.summary.devicePlacementCount).toBe(1);
    expect(ctx.plants[0]?.name).toBe('Tomato');
  });
});
