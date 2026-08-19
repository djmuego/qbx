import { describe, expect, it } from 'vitest';
import {
  growthDisplayBounds,
  growthScaleFromAge,
  plantAgeDays,
  resolvePlacementGrowthVisual,
  resolvePlantGrowthVisual,
  stageFromScale,
  formatGrowthTimelineLabel,
} from './plant-growth-visual';
import type { MapPlacement } from '../map/space-map.types';

const basePlacement: MapPlacement = {
  id: 'p1',
  kind: 'plant',
  xM: 1,
  yM: 2,
  widthM: 0.4,
  heightM: 0.4,
  rotationDeg: 0,
  plantId: 'plant-1',
};

describe('plant-growth-visual', () => {
  it('increases scale with age', () => {
    const young = growthScaleFromAge(3, 90);
    const mid = growthScaleFromAge(40, 90);
    const old = growthScaleFromAge(100, 90);
    expect(young).toBeLessThan(mid);
    expect(mid).toBeLessThan(old);
    expect(old).toBeGreaterThan(0.9);
  });

  it('maps scale to visual stages', () => {
    expect(stageFromScale(0.1)).toBe('germination');
    expect(stageFromScale(0.25)).toBe('seedling');
    expect(stageFromScale(0.5)).toBe('vegetative');
    expect(stageFromScale(0.8)).toBe('flowering');
    expect(stageFromScale(0.95)).toBe('mature');
  });

  it('uses plantedAt for age days', () => {
    const now = new Date('2026-08-18T12:00:00Z');
    const plantedAt = '2026-08-08T12:00:00Z';
    expect(plantAgeDays(plantedAt, undefined, now)).toBe(10);
  });

  it('grows placement display bounds within mature slot', () => {
    const growth = resolvePlantGrowthVisual(10, 90);
    const bounds = growthDisplayBounds(basePlacement, growth);
    expect(bounds.widthM).toBeLessThan(basePlacement.widthM);
    expect(bounds.xM).toBeGreaterThan(basePlacement.xM);
    expect(bounds.xM + bounds.widthM).toBeLessThanOrEqual(basePlacement.xM + basePlacement.widthM);
  });

  it('mature plant fills footprint', () => {
    const growth = resolvePlantGrowthVisual(120, 90);
    const bounds = growthDisplayBounds(basePlacement, growth);
    expect(bounds.widthM).toBeCloseTo(basePlacement.widthM, 2);
  });

  it('tree role uses longer cycle', () => {
    const treePlacement = { ...basePlacement, role: 'tree' };
    const young = resolvePlacementGrowthVisual(treePlacement, { id: 'x', spaceId: 's', name: 'Oak', plantedAt: '2026-07-01' }, {
      now: new Date('2026-08-18'),
    });
    const herb = resolvePlacementGrowthVisual(basePlacement, { id: 'x', spaceId: 's', name: 'Basil', plantedAt: '2026-07-01' }, {
      now: new Date('2026-08-18'),
    });
    expect(young!.scale).toBeLessThan(herb!.scale);
  });

  it('manual dimensions override auto scale', () => {
    const growth = resolvePlantGrowthVisual(5, 90, undefined, {
      canopyDiameterM: 0.35,
      matureWidthM: 0.4,
      plantHeightM: 0.5,
      matureSizeZM: 0.45,
    });
    expect(growth.growthMode).toBe('manual');
    expect(growth.canopyDiameterM).toBe(0.35);
    expect(growth.visualStageIndex).toBeGreaterThanOrEqual(1);
    expect(growth.visualStageIndex).toBeLessThanOrEqual(9);
  });

  it('preview age overrides plantedAt for visual only', () => {
    const live = resolvePlacementGrowthVisual(
      basePlacement,
      { id: 'x', spaceId: 's', name: 'Basil', plantedAt: '2026-08-01', growthMode: 'auto' },
      { now: new Date('2026-08-18') },
    );
    const preview = resolvePlacementGrowthVisual(
      basePlacement,
      { id: 'x', spaceId: 's', name: 'Basil', plantedAt: '2026-08-01', growthMode: 'auto' },
      { previewAgeDays: 75 },
    );
    expect(preview!.isPreview).toBe(true);
    expect(preview!.ageDays).toBe(75);
    expect(preview!.scale).toBeGreaterThan(live!.scale);
  });

  it('formats cycle month labels', () => {
    expect(formatGrowthTimelineLabel(0, 90)).toBe('Месяц 1/3');
    expect(formatGrowthTimelineLabel(45, 90)).toBe('Месяц 2/3');
  });
});
