import { describe, expect, it } from 'vitest';
import { buildDuplicateSpaceBundle, summarizeSpace } from './space-management';
import type { SpaceDataSnapshot } from './space-management';

const baseSnapshot = (): SpaceDataSnapshot => ({
  spaces: [
    {
      id: 'space-1',
      name: 'Тент 1',
      type: 'grow_tent',
      dimensions: { lengthM: 1.2, widthM: 1.2, heightM: 2 },
      areaM2: 1.44,
      volumeM3: 2.88,
    },
  ],
  devices: [],
  automations: [],
  spaceMaps: [
    {
      spaceId: 'space-1',
      schemaVersion: 1,
      spatialSchemaVersion: 2,
      gridStepM: 0.1,
      northOffsetDeg: 0,
      placements: [
        { id: 'pl-1', kind: 'equipment', xM: 1, yM: 1, widthM: 0.2, heightM: 0.2, rotationDeg: 0 },
      ],
      zones: [],
      relationships: [],
      updatedAt: '2026-08-19T00:00:00+07:00',
    },
  ],
  plants: [],
  plantGroups: [],
});

describe('space-management', () => {
  it('summarizes space stats', () => {
    const s = summarizeSpace(baseSnapshot(), 'space-1');
    expect(s.deviceCount).toBe(0);
    expect(s.mapObjectCount).toBe(1);
  });

  it('duplicates space with remapped ids', () => {
    const bundle = buildDuplicateSpaceBundle(baseSnapshot(), 'space-1', 'Тент 2');
    expect(bundle).not.toBeNull();
    expect(bundle!.space.name).toBe('Тент 2');
    expect(bundle!.space.id).not.toBe('space-1');
    expect(bundle!.spaceMap?.spaceId).toBe(bundle!.space.id);
    expect(bundle!.spaceMap?.placements[0].id).not.toBe('pl-1');
  });

  it('returns null for missing source', () => {
    expect(buildDuplicateSpaceBundle(baseSnapshot(), 'missing')).toBeNull();
  });
});
