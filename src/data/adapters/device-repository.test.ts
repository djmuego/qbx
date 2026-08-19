import { describe, expect, it } from 'vitest';
import { createFreshLocalDemoDataLayer } from './local-demo.repository';
import { createEmptySpaceMap, createPlacement } from '../../domain/map/space-map.geometry';

describe('device repository', () => {
  it('moves device to another space and unbinds map placements in old space', async () => {
    const layer = createFreshLocalDemoDataLayer({ skipInitialLoad: true });
    await layer.setSnapshot({
      spaces: [
        { id: 'space-a', name: 'A' },
        { id: 'space-b', name: 'B' },
      ],
      devices: [],
      automations: [],
      settings: { currentSpaceId: 'space-a', theme: 'light', tempUnit: 'C', growPhase: 'vegetation' },
      spaceMaps: [createEmptySpaceMap('space-a'), createEmptySpaceMap('space-b')],
    });

    const device = await layer.devices.create({
      modelId: 'qbx-hub',
      name: 'Hub',
      customName: 'Hub',
      spaceId: 'space-a',
    });

    const mapsBefore = await layer.spaceMaps.list();
    const mapA = mapsBefore.find((m) => m.spaceId === 'space-a')!;
    await layer.spaceMaps.save({
      ...mapA,
      placements: [
        createPlacement({
          id: 'hub-1',
          kind: 'hub',
          deviceId: device.id,
          xM: 1,
          yM: 1,
        }),
      ],
    });

    const updated = await layer.devices.update(device.id, { spaceId: 'space-b' });
    expect(updated.spaceId).toBe('space-b');

    const maps = await layer.spaceMaps.list();
    const mapAfter = maps.find((m) => m.spaceId === 'space-a');
    expect(mapAfter?.placements[0]?.deviceId).toBeUndefined();
    expect(mapAfter?.placements[0]?.id).toBe('hub-1');
  });
});
