import { describe, expect, it } from 'vitest';
import { generateSpaceLayout } from './template-generator';
import { GRID_PRESETS, applyNamedPreset } from './space-presets';
import { migrateMapTo3D, defaultZForKind } from './spatial-migration';
import { proposeSpatialRecommendations } from './spatial-recommendation';
import { createEmptySpaceMap, createPlacement } from '../../domain/map/space-map.geometry';
import { mapPlacementSchema, spaceMapSchema } from '../../data/schemas/qbx.schemas';
import { generateEnvironment } from './environment-generator';
import { resolveVisualAsset } from './asset-registry';
import { childSpaces, spatialScaleForType } from '../../domain/map/spatial-hierarchy';
import type { TemplateGenerateInput } from '../../domain/map/space-templates.types';

const tent120: TemplateGenerateInput = {
  spaceId: 'space-new',
  spaceType: 'GROW_TENT',
  dimensions: { lengthM: 1.2, widthM: 1.2, heightM: 2 },
  growMethod: 'pots',
  plantCount: 9,
  equipment: {
    mainLight: true,
    exhaust: true,
    circulationFan: true,
    climateSensor: true,
    substrateSensor: false,
    irrigation: false,
    tank: false,
    camera: false,
    hub: true,
  },
};

describe('TemplateGenerator', () => {
  it('is deterministic for the same input', () => {
    const a = generateSpaceLayout(tent120);
    const b = generateSpaceLayout(tent120);
    expect(a.map.placements.map((p) => ({ kind: p.kind, xM: p.xM, yM: p.yM, zM: p.zM }))).toEqual(
      b.map.placements.map((p) => ({ kind: p.kind, xM: p.xM, yM: p.yM, zM: p.zM })),
    );
    expect(a.plants.map((p) => p.name)).toEqual(b.plants.map((p) => p.name));
  });

  it('lays out 9 plants as a centered 3×3 grid inside 120×120', () => {
    const layout = generateSpaceLayout(tent120);
    const plants = layout.map.placements.filter((p) => p.kind === 'plant');
    expect(plants).toHaveLength(9);
    expect(layout.groups[0]?.plantIds).toHaveLength(9);
    const xs = [...new Set(plants.map((p) => p.xM))].sort((a, b) => a - b);
    const ys = [...new Set(plants.map((p) => p.yM))].sort((a, b) => a - b);
    expect(xs).toHaveLength(3);
    expect(ys).toHaveLength(3);
    const minX = Math.min(...plants.map((p) => p.xM));
    const maxX = Math.max(...plants.map((p) => p.xM + p.widthM));
    const minY = Math.min(...plants.map((p) => p.yM));
    const maxY = Math.max(...plants.map((p) => p.yM + p.heightM));
    expect(minX).toBeGreaterThan(0.05);
    expect(minY).toBeGreaterThan(0.05);
    expect(maxX).toBeLessThan(1.15);
    expect(maxY).toBeLessThan(1.15);
    const cx = plants.reduce((s, p) => s + p.xM + p.widthM / 2, 0) / 9;
    const cy = plants.reduce((s, p) => s + p.yM + p.heightM / 2, 0) / 9;
    expect(cx).toBeCloseTo(0.6, 1);
    expect(cy).toBeCloseTo(0.6, 1);
  });

  it('keeps every object inside custom room bounds', () => {
    const layout = generateSpaceLayout({
      ...tent120,
      dimensions: { lengthM: 3.4, widthM: 2.1, heightM: 2.4 },
      spaceType: 'GROW_ROOM',
      plantCount: 12,
    });
    for (const p of layout.map.placements) {
      expect(p.xM).toBeGreaterThanOrEqual(0);
      expect(p.yM).toBeGreaterThanOrEqual(0);
      expect(p.xM + p.widthM).toBeLessThanOrEqual(3.4 + 1e-6);
      expect(p.yM + p.heightM).toBeLessThanOrEqual(2.1 + 1e-6);
      expect((p.zM ?? 0) + (p.sizeZM ?? 0)).toBeLessThanOrEqual(2.4 + 1e-6);
    }
  });

  it('does not invent hardware bindings', () => {
    const layout = generateSpaceLayout(tent120);
    expect(layout.map.placements.every((p) => !p.deviceId && !p.sensorId && !p.outputId)).toBe(true);
  });

  it('sets plantedAt when plantAgeDays provided', () => {
    const layout = generateSpaceLayout({ ...tent120, plantAgeDays: 45 });
    expect(layout.plants).toHaveLength(9);
    expect(layout.plants.every((p) => p.plantedAt)).toBe(true);
  });

  it('marks 3D heights as visualization defaults, not FACT', () => {
    const layout = generateSpaceLayout(tent120);
    expect(layout.map.heightsAreDefaults).toBe(true);
    expect(layout.map.placements.every((p) => p.zSource === 'default_visualization')).toBe(true);
    const light = layout.map.placements.find((p) => p.kind === 'light');
    expect(light?.zM).toBeGreaterThan(1.2);
    const plant = layout.map.placements.find((p) => p.kind === 'plant');
    expect(plant?.zM).toBe(0);
  });
});

describe('2D → 3D migration', () => {
  it('fills default Z from object type without rewriting X/Y', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'plant', xM: 0.4, yM: 0.5, widthM: 0.3, heightM: 0.3 }),
      createPlacement({ kind: 'light', xM: 0.3, yM: 0.4, widthM: 0.6, heightM: 0.3 }),
      createPlacement({ kind: 'sensor', xM: 0.7, yM: 0.7, widthM: 0.2, heightM: 0.2 }),
    ];
    const next = migrateMapTo3D(map, { lengthM: 1.2, widthM: 1.2, heightM: 2 });
    expect(next.placements[0]!.xM).toBe(0.4);
    expect(next.placements[0]!.yM).toBe(0.5);
    expect(next.placements[0]!.zM).toBe(defaultZForKind('plant', 2));
    expect(next.placements[1]!.zM).toBe(defaultZForKind('light', 2));
    expect(next.placements[1]!.zM).toBeGreaterThan(next.placements[0]!.zM!);
    expect(next.placements.every((p) => p.zSource === 'default_visualization')).toBe(true);
    expect(next.heightsAreDefaults).toBe(true);
  });

  it('does not overwrite an explicit user Z', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'light', xM: 0.2, yM: 0.2, zM: 1.1, zSource: 'user', sizeZM: 0.05 }),
    ];
    const next = migrateMapTo3D(map, { lengthM: 1.2, widthM: 1.2, heightM: 2 });
    expect(next.placements[0]!.zM).toBe(1.1);
    expect(next.placements[0]!.zSource).toBe('user');
  });

  it('round-trips 3D fields through the persistence schema', () => {
    const parsed = mapPlacementSchema.parse({
      id: 'plc-1',
      kind: 'sensor',
      xM: 0.5,
      yM: 0.4,
      zM: 0.45,
      widthM: 0.2,
      heightM: 0.2,
      sizeZM: 0.08,
      rotationDeg: 0,
      mounting: 'hanging',
      zSource: 'default_visualization',
    });
    expect(parsed.zM).toBe(0.45);
    const map = spaceMapSchema.parse({
      spaceId: 's1',
      schemaVersion: 1,
      gridStepM: 0.1,
      northOffsetDeg: 0,
      zones: [],
      placements: [parsed],
      updatedAt: '2026-08-18T00:00:00.000Z',
      appliedTemplateId: 'grow-tent-120',
      heightsAreDefaults: true,
    });
    expect(map.appliedTemplateId).toBe('grow-tent-120');
  });
});

describe('Presets', () => {
  it('Grow Tent 80×80 has 4 plants, light, exhaust, circulation, climate sensor', () => {
    const layout = applyNamedPreset('tent-80-4');
    expect(layout.map.placements.filter((p) => p.kind === 'plant')).toHaveLength(4);
    expect(layout.map.placements.some((p) => p.kind === 'light')).toBe(true);
    expect(layout.map.placements.some((p) => p.role === 'exhaust')).toBe(true);
    expect(layout.map.placements.some((p) => p.role === 'circulation')).toBe(true);
    expect(layout.map.placements.some((p) => p.kind === 'sensor' && p.role === 'climate')).toBe(true);
    expect(GRID_PRESETS).toHaveLength(22);
  });

  it('Vertical rack uses 3 Z levels', () => {
    const layout = applyNamedPreset('vertical-rack-3');
    const plants = layout.map.placements.filter((p) => p.kind === 'plant');
    const zs = [...new Set(plants.map((p) => p.zM ?? 0))];
    expect(zs.length).toBeGreaterThanOrEqual(3);
    expect(layout.map.placements.some((p) => p.kind === 'structure' && (p.rackLevels ?? 0) >= 3)).toBe(true);
    expect(plants.every((p) => p.parentId)).toBe(true);
  });
});

describe('AI spatial recommendations', () => {
  it('never mutates the map', () => {
    const layout = generateSpaceLayout(tent120);
    const before = JSON.stringify(layout.map);
    const recs = proposeSpatialRecommendations(layout.map, tent120.dimensions);
    expect(JSON.stringify(layout.map)).toBe(before);
    expect(recs.every((r) => r.suggestedPosition)).toBe(true);
    expect(recs.every((r) => r.confidence === 'low' || r.confidence === 'medium' || r.confidence === 'high')).toBe(
      true,
    );
  });
});

describe('Environment + hierarchy foundation', () => {
  it('builds a room shell from real meters, not a background image', () => {
    const env = generateEnvironment('GROW_ROOM', { lengthM: 6, widthM: 4, heightM: 2.8 });
    expect(env.lengthM).toBe(6);
    expect(env.widthM).toBe(4);
    expect(env.heightM).toBe(2.8);
    const floor = env.parts.find((p) => p.kind === 'floor');
    expect(floor?.widthM).toBe(6);
    expect(floor?.depthM).toBe(4);
    expect(env.parts.some((p) => p.kind === 'wall')).toBe(true);
  });

  it('AssetRegistry V1 is procedural and can later point at GLB', () => {
    const plant = resolveVisualAsset('plant');
    expect(plant.render).toBe('sprite');
    expect(plant.proceduralKey).toBe('plant');
  });

  it('Site → Room parentId is a space tree, not a second map format', () => {
    expect(spatialScaleForType('grow_tent')).toBe('L1_MICRO');
    expect(spatialScaleForType('grow_room')).toBe('L2_ROOM');
    expect(spatialScaleForType('facility')).toBe('L3_FACILITY');
    expect(spatialScaleForType('site')).toBe('L4_SITE');
    const spaces = [
      { id: 'site-1', name: 'Farm', type: 'site' as const },
      { id: 'gh-a', name: 'Greenhouse A', type: 'greenhouse' as const, parentId: 'site-1' },
      { id: 'room-1', name: 'Grow Room #1', type: 'grow_room' as const, parentId: 'gh-a' },
    ];
    expect(childSpaces(spaces, 'site-1').map((s) => s.id)).toEqual(['gh-a']);
    expect(childSpaces(spaces, 'gh-a').map((s) => s.id)).toEqual(['room-1']);
  });
});
