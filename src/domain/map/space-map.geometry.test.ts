import { describe, expect, it } from 'vitest';
import {
  clampPlacementToBounds,
  compassQuadrant,
  createEmptySpaceMap,
  createPlacement,
  DEFAULT_GRID_STEP_M,
  distanceM,
  isPlacementInZone,
  isPointInZone,
  nearestPlacement,
  placementCenter,
  snapToGrid,
} from './space-map.geometry';
import type { MapPlacement, MapZone } from './space-map.types';

const bounds = { lengthM: 4, widthM: 6 };

function plantAt(xM: number, yM: number, id = 'p1'): MapPlacement {
  return createPlacement({
    id,
    kind: 'plant',
    xM,
    yM,
    widthM: 0.3,
    heightM: 0.3,
  });
}

describe('Grow Map geometry', () => {
  it('snaps to 0.1 m grid', () => {
    expect(DEFAULT_GRID_STEP_M).toBe(0.1);
    expect(snapToGrid(1.24)).toBe(1.2);
    expect(snapToGrid(1.25)).toBe(1.3);
    expect(snapToGrid(0.04)).toBe(0);
  });

  it('clamps placement inside room bounds without dropping it', () => {
    const overflowing = createPlacement({
      kind: 'structure',
      xM: 3.8,
      yM: 5.8,
      widthM: 1,
      heightM: 1,
    });
    const clamped = clampPlacementToBounds(overflowing, bounds);
    expect(clamped.xM + clamped.widthM).toBeLessThanOrEqual(bounds.lengthM + 1e-9);
    expect(clamped.yM + clamped.heightM).toBeLessThanOrEqual(bounds.widthM + 1e-9);
    expect(clamped.xM).toBeGreaterThanOrEqual(0);
    expect(clamped.yM).toBeGreaterThanOrEqual(0);
  });

  it('shrinks objects larger than the room so they still fit', () => {
    const huge = createPlacement({
      kind: 'structure',
      xM: 0,
      yM: 0,
      widthM: 10,
      heightM: 10,
    });
    const clamped = clampPlacementToBounds(huge, bounds);
    expect(clamped.widthM).toBeLessThanOrEqual(bounds.lengthM);
    expect(clamped.heightM).toBeLessThanOrEqual(bounds.widthM);
    expect(clamped.xM).toBe(0);
    expect(clamped.yM).toBe(0);
  });

  it('detects zone membership by center point', () => {
    const zone: MapZone = { id: 'zone-a', name: 'Zone A', xM: 0, yM: 3, widthM: 2, heightM: 3 };
    expect(isPointInZone(0.5, 4, zone)).toBe(true);
    expect(isPointInZone(3, 1, zone)).toBe(false);
    expect(isPlacementInZone(plantAt(0.4, 4.2), zone)).toBe(true);
    expect(isPlacementInZone(plantAt(3, 0.2), zone)).toBe(false);
  });

  it('computes distance between placement centers', () => {
    const a = plantAt(0, 0);
    const b = plantAt(3, 4);
    const ca = placementCenter(a);
    const cb = placementCenter(b);
    expect(ca.xM).toBeCloseTo(0.15);
    expect(ca.yM).toBeCloseTo(0.15);
    expect(distanceM(ca, cb)).toBeCloseTo(Math.hypot(cb.xM - ca.xM, cb.yM - ca.yM));
  });

  it('finds nearest fan to a plant', () => {
    const plant = plantAt(0.2, 5.5, 'tomato-1');
    const nearFan = createPlacement({
      id: 'fan-nw',
      kind: 'equipment',
      outputId: 'fan-near',
      xM: 0.5,
      yM: 5,
      widthM: 0.4,
      heightM: 0.4,
    });
    const farFan = createPlacement({
      id: 'fan-se',
      kind: 'equipment',
      outputId: 'fan-far',
      xM: 3.4,
      yM: 0.2,
      widthM: 0.4,
      heightM: 0.4,
    });
    const nearest = nearestPlacement(plant, [farFan, nearFan]);
    expect(nearest?.id).toBe('fan-nw');
  });

  it('maps SW origin to compass quadrants (+Y = north)', () => {
    expect(compassQuadrant(0.5, 5.5, bounds)).toBe('NW');
    expect(compassQuadrant(3.5, 5.5, bounds)).toBe('NE');
    expect(compassQuadrant(0.5, 0.5, bounds)).toBe('SW');
    expect(compassQuadrant(3.5, 0.5, bounds)).toBe('SE');
  });

  it('creates an empty map for a space', () => {
    const map = createEmptySpaceMap('space-1');
    expect(map.spaceId).toBe('space-1');
    expect(map.schemaVersion).toBe(1);
    expect(map.gridStepM).toBe(0.1);
    expect(map.northOffsetDeg).toBe(0);
    expect(map.zones).toEqual([]);
    expect(map.placements).toEqual([]);
  });
});
