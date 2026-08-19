import { describe, expect, it } from 'vitest';
import { resolveSpatialAsset, spriteVisualSize } from './resolve-spatial-asset';
import { objectSpriteAssets, spatialAssetById } from '../registry/spatial-asset-registry';
import { createPlacement } from '../../../domain/map/space-map.geometry';
import type { Plant } from '../../../domain/grow/plant.types';
import { resolvePlantGrowthVisual } from '../../../domain/grow/plant-growth-visual';
import { resolveVisualAsset } from '../../../application/map/asset-registry';

describe('Spatial AssetRegistry', () => {
  it('maps pack images to semantic ids, never filenames', () => {
    const plant = spatialAssetById('plant.stage.05');
    expect(plant?.source).toContain('/assets/spatial/plants/growth/');
    expect(plant?.source).not.toContain('/img/');
    expect(objectSpriteAssets().every((a) => !a.source?.includes('/img/'))).toBe(true);
  });

  it('uses growth stage sprites for plants and real assets for equipment', () => {
    const growth = resolvePlantGrowthVisual(10, 90);
    expect(resolveSpatialAsset(createPlacement({ kind: 'plant' }), { growthVisual: growth }).id).toMatch(/^plant\.stage\./);
    expect(resolveSpatialAsset(createPlacement({ kind: 'plant' }), { plant: { id: 'p', spaceId: 's', name: 'x', medium: 'hydro' } as Plant }).id).toBe(
      'plant.hydro',
    );
    expect(resolveSpatialAsset(createPlacement({ kind: 'light' })).id).toBe('light.panel');
    expect(resolveSpatialAsset(createPlacement({ kind: 'equipment', role: 'exhaust' })).id).toBe('climate.exhaust');
    expect(resolveSpatialAsset(createPlacement({ kind: 'equipment', role: 'intake' })).id).toBe('climate.filter');
    expect(resolveSpatialAsset(createPlacement({ kind: 'sensor' })).renderType).toBe('sprite');
    expect(resolveSpatialAsset(createPlacement({ kind: 'hub' })).renderType).toBe('sprite');
    expect(resolveSpatialAsset(createPlacement({ kind: 'structure', role: 'rack' })).renderType).toBe('sprite');
  });

  it('never returns an invisible object — missing sprite falls back to procedural', () => {
    const unknown = resolveSpatialAsset(createPlacement({ kind: 'structure', role: 'door' }));
    expect(unknown.renderType).toBe('procedural');
  });

  it('keeps hanging lights visually sized from registry, not 5 cm slab', () => {
    const light = createPlacement({ kind: 'light', widthM: 0.6, heightM: 0.3, sizeZM: 0.05 });
    const asset = resolveSpatialAsset(light);
    const size = spriteVisualSize(light, asset);
    expect(size.heightM).toBeGreaterThan(0.04);
    expect(size.widthM).toBeGreaterThan(0.4);
  });

  it('clamps sensors to handheld scale', () => {
    const sensor = createPlacement({ kind: 'sensor', widthM: 1.2, heightM: 1.2, sizeZM: 1.2 });
    const asset = resolveSpatialAsset(sensor);
    const size = spriteVisualSize(sensor, asset);
    expect(size.widthM).toBeLessThanOrEqual(0.16);
    expect(size.heightM).toBeLessThanOrEqual(0.16);
  });

  it('legacy resolveVisualAsset still works and plant is now a sprite', () => {
    expect(resolveVisualAsset('plant').render).toBe('sprite');
    expect(resolveVisualAsset('exhaustFan').render).toBe('sprite');
    expect(resolveVisualAsset('sensor').render).toBe('sprite');
  });

  it('plant stage sprites include container metadata', () => {
    const stage = spatialAssetById('plant.stage.03');
    expect(stage?.includesContainer).toBe(true);
    expect(stage?.billboard).toBe('cross-billboard');
  });
});
