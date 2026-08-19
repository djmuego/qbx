import { describe, expect, it } from 'vitest';
import {
  plantStoreEnvelopeSchema,
  spaceMapSchema,
  unwrapPlantStore,
  wrapPlantStore,
} from './qbx.schemas';

describe('Grow Map schemas', () => {
  it('parses a SpaceMap envelope', () => {
    const parsed = spaceMapSchema.parse({
      spaceId: 'space-1',
      schemaVersion: 1,
      gridStepM: 0.1,
      northOffsetDeg: 0,
      zones: [{ id: 'zone-a', name: 'Zone A', xM: 0, yM: 3, widthM: 2, heightM: 3 }],
      placements: [
        {
          id: 'plc-1',
          kind: 'sensor',
          xM: 0.5,
          yM: 4,
          widthM: 0.2,
          heightM: 0.2,
          rotationDeg: 0,
          deviceId: 'dev-1',
          sensorId: 'dev1-in1',
        },
      ],
      updatedAt: '2026-08-18T05:00:00+07:00',
    });
    expect(parsed.placements[0]?.sensorId).toBe('dev1-in1');
  });

  it('parses plant store roundtrip', () => {
    const wrapped = wrapPlantStore({
      plants: [
        {
          id: 'plant-1',
          spaceId: 'space-1',
          name: 'Томат Cherry #1',
          medium: 'coco',
          potVolumeL: 15,
        },
      ],
      groups: [{ id: 'grp-1', spaceId: 'space-1', name: 'Zone A tomatoes', plantIds: ['plant-1'] }],
    });
    const parsed = plantStoreEnvelopeSchema.parse(wrapped);
    expect(unwrapPlantStore(parsed).plants[0]?.name).toBe('Томат Cherry #1');
  });

  it('rejects unknown placement kind', () => {
    const result = spaceMapSchema.safeParse({
      spaceId: 'space-1',
      schemaVersion: 1,
      gridStepM: 0.1,
      northOffsetDeg: 0,
      zones: [],
      placements: [{ id: 'x', kind: 'spaceship', xM: 0, yM: 0, widthM: 1, heightM: 1, rotationDeg: 0 }],
      updatedAt: '2026-08-18T05:00:00+07:00',
    });
    expect(result.success).toBe(false);
  });
});
