import { describe, expect, it } from 'vitest';
import { buildGrowContext } from '../ai/grow-context.builder';
import { buildIntelligenceContext } from './intelligence-context.builder';
import { createEmptySpaceMap, createPlacement } from '../../domain/map/space-map.geometry';
import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';

const space: Space = {
  id: 's1',
  name: 'Tent',
  dimensions: { lengthM: 4, widthM: 6, heightM: 2.8 },
  areaM2: 24,
  volumeM3: 67.2,
};

const map = createEmptySpaceMap('s1');
map.zones = [{ id: 'zone-a', name: 'Zone A', xM: 0, yM: 3, widthM: 2, heightM: 3 }];
map.placements = [
  createPlacement({ id: 'p1', kind: 'plant', plantId: 'plant-1', xM: 0.4, yM: 4.2, zoneId: 'zone-a' }),
  createPlacement({ id: 'fan1', kind: 'equipment', deviceId: 'd1', outputId: 'fan1', xM: 3.2, yM: 0.3 }),
];

describe('Grow Map in Digital Twin / GrowContext', () => {
  it('includes compact geometry in grow context without inventing readings', () => {
    const ctx = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
      spaceMap: map,
      plants: [{ id: 'plant-1', spaceId: 's1', name: 'Томат Cherry #1', medium: 'coco', potVolumeL: 15 }],
    });

    expect(ctx.space?.geometry?.lengthM).toBe(4);
    expect(ctx.space?.geometry?.widthM).toBe(6);
    expect(ctx.space?.geometry?.zoneCount).toBe(1);
    expect(ctx.space?.geometry?.placementCount).toBe(2);
    expect(ctx.space?.geometry?.placements.some((p) => p.kind === 'plant' && p.xM === 0.4)).toBe(true);
    expect(ctx.plants?.[0]?.name).toBe('Томат Cherry #1');
    expect(ctx.plants?.[0]).not.toHaveProperty('healthScore');
    expect(ctx.dataQuality.hasLiveSensorData).toBe(false);
  });

  it('omits geometry when space has no dimensions', () => {
    const ctx = buildGrowContext({
      space: { id: 's1', name: 'Tent' },
      growPhase: 'vegetation',
      devices: [],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    expect(ctx.space?.geometry).toBeUndefined();
  });

  it('copies geometry into SpaceDigitalTwin', () => {
    const ctx = buildIntelligenceContext({
      space,
      growPhase: 'vegetation',
      devices: [] as Device[],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
      spaceMap: map,
      plants: [{ id: 'plant-1', spaceId: 's1', name: 'Томат Cherry #1' }],
    });

    expect(ctx.digitalTwin.geometry?.placementCount).toBe(2);
    expect(ctx.digitalTwin.zoneCount).toBe(1);
    expect(ctx.digitalTwin.geometry?.placements.find((p) => p.kind === 'equipment')?.outputId).toBe('fan1');
  });
});
