import { describe, expect, it } from 'vitest';
import { createEmptySpaceMap, createPlacement } from '../../domain/map/space-map.geometry';
import { spaceMapSchema } from '../../data/schemas/qbx.schemas';
import { migrateSpatialSchema, CURRENT_SPATIAL_SCHEMA_VERSION } from './spatial-schema.migration';
import { snapValue, SNAP_STEPS_M } from '../../domain/map/spatial-snap';
import { generatePlantGroupInstances } from '../../domain/map/plant-group-layout';
import { validateSpatialMap } from '../../domain/map/spatial-validation';
import { createMapHistory } from './map-history';
import { OBJECT_LIBRARY } from '../../domain/map/spatial-object-library';
import { proposeLogicalPowerLinks } from '../electrical/electrical-planner';
import { buildIrrigationGraph } from '../irrigation/irrigation-graph';
import { buildSpatialContext } from '../intelligence/spatial-context.builder';
import { estimatedLightFootprint } from '../../domain/map/coverage-overlays';
import { unbindDeviceFromMap } from '../../domain/map/spatial-device-bind';
import type { Space } from '../../domain/space/space.types';
import type { Device } from '../../domain/device/device.types';

const room = { lengthM: 4, widthM: 8, heightM: 3.2 };

function space(): Space {
  return {
    id: 's1',
    name: 'Room',
    type: 'grow_room',
    dimensions: room,
    isDefault: true,
    deviceIds: [],
  };
}

describe('Spatial Digital Twin productization pass', () => {
  it('keeps the same x/y for 2D and 3D after schema v2 migration', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'light', xM: 1.25, yM: 2.5, zM: 0, widthM: 0.6, heightM: 0.3, rotationDeg: 90 }),
    ];
    const migrated = migrateSpatialSchema(map, room);
    expect(migrated.spatialSchemaVersion).toBe(CURRENT_SPATIAL_SCHEMA_VERSION);
    expect(migrated.placements[0]?.xM).toBe(1.25);
    expect(migrated.placements[0]?.yM).toBe(2.5);
    expect(migrated.placements[0]?.rotationDeg).toBe(90);
    expect(spaceMapSchema.parse(migrated).placements[0]?.xM).toBe(1.25);
  });

  it('parses a legacy map without spatialSchemaVersion', () => {
    const parsed = spaceMapSchema.parse({
      spaceId: 's1',
      schemaVersion: 1,
      gridStepM: 0.1,
      northOffsetDeg: 0,
      zones: [],
      placements: [{ id: 'p1', kind: 'hub', xM: 0.1, yM: 0.1, widthM: 0.25, heightM: 0.2, rotationDeg: 0 }],
      updatedAt: '2026-08-18T06:00:00+07:00',
    });
    expect(parsed.placements[0]?.kind).toBe('hub');
  });

  it('accepts outlet and electrical_panel kinds', () => {
    const parsed = spaceMapSchema.parse({
      spaceId: 's1',
      schemaVersion: 1,
      spatialSchemaVersion: 2,
      gridStepM: 0.1,
      northOffsetDeg: 0,
      zones: [{ id: 'z1', name: 'Zone A', type: 'vegetative', xM: 0, yM: 0, widthM: 2, heightM: 2 }],
      placements: [
        { id: 'o1', kind: 'outlet', xM: 0.2, yM: 0.2, widthM: 0.12, heightM: 0.08, rotationDeg: 0, catalogId: 'outlet' },
        { id: 'b1', kind: 'electrical_panel', xM: 0.1, yM: 0.1, widthM: 0.3, heightM: 0.12, rotationDeg: 0 },
      ],
      relationships: [{ id: 'r1', type: 'sensor_monitors_zone', fromId: 'o1', toId: 'z1' }],
      updatedAt: '2026-08-18T06:00:00+07:00',
    });
    expect(parsed.placements.map((p) => p.kind)).toEqual(['outlet', 'electrical_panel']);
    expect(parsed.zones[0]?.type).toBe('vegetative');
  });

  it('snaps to 10/25/50 cm and leaves values untouched when OFF', () => {
    expect(SNAP_STEPS_M.off).toBe(0);
    expect(snapValue(0.23, 0.25)).toBeCloseTo(0.25);
    expect(snapValue(0.23, 0.1)).toBeCloseTo(0.2);
    expect(snapValue(0.23, 0)).toBeCloseTo(0.23);
  });

  it('builds a 4×8 plant group as one logical entity with 32 instance offsets', () => {
    const group = createPlacement({
      kind: 'plant_group',
      xM: 1,
      yM: 1,
      widthM: 3.2,
      heightM: 1.6,
      groupRows: 4,
      groupCols: 8,
      spacingXM: 0.45,
      spacingYM: 0.45,
    });
    const instances = generatePlantGroupInstances(group);
    expect(instances).toHaveLength(32);
    expect(instances[0]).toMatchObject({ col: 0, row: 0 });
    expect(instances.at(-1)).toMatchObject({ col: 7, row: 3 });
  });

  it('warns when a placement is outside the room or a ceiling device exceeds height', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'structure', xM: 10, yM: 0, widthM: 1, heightM: 1 }),
      createPlacement({ kind: 'light', xM: 0.5, yM: 0.5, zM: 3.5, sizeZM: 0.1, mounting: 'ceiling' }),
    ];
    const warnings = validateSpatialMap(map, room);
    expect(warnings.some((w) => w.code === 'outside_room')).toBe(true);
    expect(warnings.some((w) => w.code === 'above_ceiling')).toBe(true);
  });

  it('undo/redo restores placements without touching runtime history', () => {
    const history = createMapHistory();
    const a = createEmptySpaceMap('s1');
    const b = { ...a, placements: [createPlacement({ kind: 'hub', xM: 1, yM: 1 })], updatedAt: 't2' };
    history.push(a);
    expect(history.undo(b)?.placements).toHaveLength(0);
    expect(history.redo(a)?.placements).toHaveLength(1);
  });

  it('object library covers plants, structure, light, climate, sensors, irrigation, qbx, infrastructure', () => {
    const cats = new Set(OBJECT_LIBRARY.map((i) => i.category));
    expect(cats).toEqual(
      new Set(['plants', 'structure', 'light', 'climate', 'sensors', 'irrigation', 'qbx', 'infrastructure', 'outdoor']),
    );
    expect(OBJECT_LIBRARY.find((i) => i.id === 'led-hanging')?.kind).toBe('light');
    expect(OBJECT_LIBRARY.find((i) => i.id === 'outlet')?.kind).toBe('outlet');
  });

  it('does not invent electrical load when ratedPowerW is missing', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'light', xM: 1, yM: 1, label: 'LED' }),
      createPlacement({ kind: 'outlet', xM: 0.2, yM: 1, catalogId: 'outlet' }),
    ];
    const plan = proposeLogicalPowerLinks(map);
    expect(plan.disclaimer).toMatch(/логическ/i);
    expect(plan.links[0]?.toId).toBe(map.placements[1]?.id);
    expect(plan.totalRatedW).toBeNull();
    expect(plan.findings.some((f) => f.code === 'unknown_load')).toBe(true);
    expect(JSON.stringify(plan)).not.toMatch(/2\.8/);
  });

  it('sums only user-entered watts', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'light', xM: 1, yM: 1, ratedPowerW: 200 }),
      createPlacement({ kind: 'equipment', xM: 2, yM: 1, role: 'exhaust', ratedPowerW: 80 }),
      createPlacement({ kind: 'outlet', xM: 0.2, yM: 1 }),
    ];
    const plan = proposeLogicalPowerLinks(map);
    expect(plan.totalRatedW).toBe(280);
  });

  it('builds irrigation graph tank → pump → zone without inventing flow rates', () => {
    const map = createEmptySpaceMap('s1');
    map.zones = [{ id: 'z-irr', name: 'Irrigation 1', xM: 0, yM: 0, widthM: 2, heightM: 2 }];
    map.placements = [
      createPlacement({ kind: 'irrigation', role: 'reservoir', xM: 0.2, yM: 0.2, label: 'Tank' }),
      createPlacement({ kind: 'irrigation', role: 'pump', xM: 0.5, yM: 0.2, label: 'Pump' }),
      createPlacement({ kind: 'plant_group', xM: 1, yM: 1, zoneId: 'z-irr' }),
    ];
    const graph = buildIrrigationGraph(map);
    expect(graph.nodes.map((n) => n.role)).toEqual(expect.arrayContaining(['tank', 'pump', 'zone']));
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.flowRateUnknown).toBe(true);
  });

  it('SpatialContextBuilder exposes mounting, relationships, and never fills missing sensor values', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'sensor', xM: 3.5, yM: 7, zM: 1.2, mounting: 'wall', label: 'T/RH' }),
      createPlacement({ kind: 'equipment', xM: 3.6, yM: 7.2, zM: 2.2, role: 'exhaust', mounting: 'wall' }),
    ];
    map.zones = [{ id: 'zb', name: 'Zone B', xM: 0, yM: 0, widthM: 2, heightM: 2 }];
    map.relationships = [{ id: 'rel-1', type: 'sensor_monitors_zone', fromId: map.placements[0]!.id, toId: 'zb' }];
    const ctx = buildSpatialContext({ space: space(), map, devices: [] as Device[] });
    expect(ctx.mounting?.length).toBeGreaterThan(0);
    expect(ctx.relationships?.[0]?.type).toBe('sensor_monitors_zone');
    expect(ctx.insights.some((i) => i.kind === 'zone_without_sensor')).toBe(true);
    expect(ctx.liveReadings ?? []).toEqual([]);
  });

  it('light footprint is geometric ESTIMATED and has no PPFD number', () => {
    const light = createPlacement({ kind: 'light', xM: 1, yM: 1, zM: 2.4, widthM: 1.2, heightM: 0.4, coverageWidthM: 1.4, coverageDepthM: 0.8 });
    const fp = estimatedLightFootprint(light);
    expect(fp.kind).toBe('ESTIMATED');
    expect(fp.ppfd).toBeUndefined();
    expect(fp.widthM).toBe(1.4);
  });

  it('removing a Device bind keeps the spatial object', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({
        kind: 'sensor',
        xM: 1,
        yM: 1,
        widthM: 0.2,
        heightM: 0.2,
        rotationDeg: 0,
        deviceId: 'dev-keep-spatial',
        sensorId: 'dev-keep-spatial-in1',
      }),
    ];
    const next = unbindDeviceFromMap(map, 'dev-keep-spatial');
    expect(next.placements).toHaveLength(1);
    expect(next.placements[0]?.kind).toBe('sensor');
    expect(next.placements[0]?.xM).toBe(1);
    expect(next.placements[0]?.deviceId).toBeUndefined();
    expect(next.placements[0]?.sensorId).toBeUndefined();
  });
});
