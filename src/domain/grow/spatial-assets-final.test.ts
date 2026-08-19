import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  plantStageAssetId,
  resolvePlantGrowthVisual,
  visualStageFromScale,
  visualStageLabel,
} from './plant-growth-visual';
import {
  preloadPlantStageUrls,
  resolveSpatialAsset,
  spriteVisualSize,
} from '../../features/map3d/assets/resolve-spatial-asset';
import { spatialAssetById } from '../../features/map3d/registry/spatial-asset-registry';
import { createPlacement } from '../map/space-map.geometry';
import type { Plant } from './plant.types';

describe('plant growth visual stages', () => {
  it('maps scale to 9 visual stages with boundaries', () => {
    expect(visualStageFromScale(0.06).visualStageIndex).toBe(1);
    expect(visualStageFromScale(0.2).visualStageIndex).toBeGreaterThanOrEqual(2);
    expect(visualStageFromScale(0.5).visualStageIndex).toBeGreaterThanOrEqual(4);
    expect(visualStageFromScale(0.5).visualStageIndex).toBeLessThanOrEqual(6);
    expect(visualStageFromScale(1).visualStageIndex).toBe(9);
  });

  it('holds texture stage while scale interpolates within band', () => {
    const low = visualStageFromScale(0.45);
    const high = visualStageFromScale(0.48);
    expect(low.visualStageIndex).toBe(high.visualStageIndex);
    expect(high.visualStageProgress).toBeGreaterThan(low.visualStageProgress);
  });

  it('manual dimensions take priority over auto age', () => {
    const growth = resolvePlantGrowthVisual(3, 90, undefined, {
      canopyDiameterM: 0.38,
      matureWidthM: 0.4,
      plantHeightM: 0.55,
      matureSizeZM: 0.45,
    });
    expect(growth.growthMode).toBe('manual');
    expect(growth.canopyDiameterM).toBe(0.38);
    expect(growth.plantHeightM).toBe(0.55);
  });

  it('resolves semantic asset id from visual stage index', () => {
    expect(plantStageAssetId(1)).toBe('plant.stage.01');
    expect(plantStageAssetId(9)).toBe('plant.stage.09');
    expect(visualStageLabel(5)).toContain('Вегетация');
  });
});

describe('spatial asset integration', () => {
  it('resolves plant growth stage sprites', () => {
    const growth = resolvePlantGrowthVisual(60, 90);
    const asset = resolveSpatialAsset(createPlacement({ kind: 'plant' }), { growthVisual: growth });
    expect(asset.id).toBe(`plant.stage.${String(growth.visualStageIndex).padStart(2, '0')}`);
    expect(asset.renderType).toBe('sprite');
    expect(asset.includesContainer).toBe(true);
  });

  it('3D plants use procedural mesh, not registry sprites', () => {
    const src = readFileSync(join(process.cwd(), 'src/features/map3d/components/SpatialObjectView.tsx'), 'utf8');
    const plantBlock = src.slice(
      src.indexOf("if (placement.kind === 'plant'"),
      src.indexOf('const asset = resolveSpatialAsset'),
    );
    expect(plantBlock).toContain('<ProceduralObject');
    expect(plantBlock).not.toContain('SpatialSprite');
  });

  it('falls back to procedural when sprite source missing', () => {
    const asset = resolveSpatialAsset(createPlacement({ kind: 'structure', role: 'door' }));
    expect(asset.renderType).toBe('procedural');
  });

  it('uses real sprites for sensors and controllers', () => {
    expect(resolveSpatialAsset(createPlacement({ kind: 'sensor' })).id).toBe('sensor.environment');
    expect(resolveSpatialAsset(createPlacement({ kind: 'sensor' })).renderType).toBe('sprite');
    expect(resolveSpatialAsset(createPlacement({ kind: 'hub' })).id).toBe('qbx.controller');
    expect(resolveSpatialAsset(createPlacement({ kind: 'hub' })).renderType).toBe('sprite');
  });

  it('preserves aspect ratio with contain fit', () => {
    const asset = spatialAssetById('light.panel')!;
    const size = spriteVisualSize({ kind: 'light', widthM: 0.6, sizeZM: 0.05 }, asset);
    const aspect = size.widthM / size.heightM;
    expect(aspect).toBeCloseTo(asset.aspectRatio!, 1);
  });

  it('sizes plants from growth canopy and height', () => {
    const growth = resolvePlantGrowthVisual(80, 90);
    const asset = spatialAssetById('plant.stage.08')!;
    const size = spriteVisualSize({ kind: 'plant', widthM: 0.4, sizeZM: 0.5 }, asset, growth);
    expect(size.heightM).toBeCloseTo(growth.plantHeightM, 2);
    expect(size.widthM).toBeGreaterThan(0.1);
  });

  it('preloads current and next plant stage textures', () => {
    const urls = preloadPlantStageUrls(4);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('plant-stage-04');
    expect(urls[1]).toContain('plant-stage-05');
  });

  it('hydro medium uses dedicated sprite', () => {
    const hydro = { id: 'p', spaceId: 's', name: 'x', medium: 'hydro' } as Plant;
    expect(resolveSpatialAsset(createPlacement({ kind: 'plant' }), { plant: hydro }).id).toBe('plant.hydro');
  });
});
