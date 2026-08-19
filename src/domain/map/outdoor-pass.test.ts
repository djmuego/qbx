import { describe, expect, it } from 'vitest';
import { generateEnvironment } from '../../application/map/environment-generator';
import { generateSiteLayout, deletePlacementPreservesChildSpace } from '../../application/map/site-template-generator';
import { applyNamedPreset } from '../../application/map/space-presets';
import { migrateSpatialSchema, CURRENT_SPATIAL_SCHEMA_VERSION } from '../../application/map/spatial-schema.migration';
import { isOutdoorEnvironment, isOutdoorPreset } from '../../domain/map/environment.types';
import { createEmptySpaceMap, gridStepForScale } from '../../domain/map/space-map.geometry';
import {
  generateGridBeds,
  generateOrchardRows,
  generateParallelBeds,
  generatePlantRow,
  resetSiteLayoutSeq,
} from '../../domain/map/site-layout';
import { defaultTerrainForPreset } from '../../domain/map/terrain.types';
import { buildSolarContext } from '../../domain/map/solar-context';
import { visualGridSteps } from '../../domain/map/visual-grid';
import {
  answerOutdoorSpatialQuestion,
  countBeds,
  liveOutdoorReading,
} from '../../domain/map/outdoor-spatial-queries';
import { bindPlacement, listCompatibleBindTargets } from '../../domain/map/spatial-device-bind';
import { createPlacement } from '../../domain/map/space-map.geometry';
import type { Device } from '../../domain/device/device.types';
import type { Sensor } from '../../domain/sensor/sensor.types';

function soilDevice(): Device {
  const soil: Sensor = {
    id: 'in-1',
    portNumber: 1,
    hardwareLabel: 'IN1',
    type: 'soil_moisture',
    name: 'Soil',
    customName: 'Soil',
    value: 31,
    currentValue: 31,
    unit: '%',
    optimalMin: 20,
    optimalMax: 60,
    status: 'normal',
    visibleOnHome: true,
    showOnHome: true,
    history: [],
  };
  return {
    id: 'dev-1',
    spaceId: 's1',
    modelId: 'hub',
    model: 'hub',
    modelName: 'Hub',
    name: 'Hub',
    customName: 'Hub',
    status: 'online',
    isOnline: true,
    capabilities: {
      sensorInputCount: 1,
      outputCount: 0,
      supportedSensorTypes: ['soil_moisture'],
      supportedOutputTypes: [],
      specialCapabilities: [],
    },
    sensors: [soil],
    inputs: [soil],
    outputs: [],
    firmwareVersion: '1',
    serialNumber: '1',
    addedAt: new Date().toISOString(),
  };
}

describe('Outdoor / Terrain / Farm Maps Pass V1', () => {
  it('boots outdoor terrain from preset', () => {
    const env = generateEnvironment('SMALL_FARM', { lengthM: 100, widthM: 50, heightM: 6 });
    expect(env.parts.some((p) => p.kind === 'floor')).toBe(true);
    expect(env.parts[0]?.material).toBe('grass');
  });

  it('classifies outdoor environment types and presets', () => {
    expect(isOutdoorPreset('SMALL_FARM')).toBe(true);
    expect(isOutdoorPreset('GROW_TENT')).toBe(false);
    expect(isOutdoorEnvironment('orchard')).toBe(true);
    expect(isOutdoorEnvironment('grow_room')).toBe(false);
  });

  it('assigns terrain material per preset', () => {
    expect(defaultTerrainForPreset('ORCHARD').materialId).toBe('naturalSoil');
    expect(defaultTerrainForPreset('OUTDOOR_GARDEN').type).toBe('grass');
  });

  it('preserves north angle on map', () => {
    const map = createEmptySpaceMap('s1');
    map.northOffsetDeg = 42;
    expect(map.northOffsetDeg).toBe(42);
    expect(buildSolarContext(42).northAngleDeg).toBe(42);
  });

  it('handles large coordinate precision at farm scale', () => {
    const layout = generateSiteLayout({
      spaceId: 'farm-1',
      preset: 'SMALL_FARM',
      dimensions: { lengthM: 100, widthM: 50, heightM: 6 },
      templateId: 'small-farm-100x50',
    });
    const gh = layout.map.placements.find((p) => p.label === 'Greenhouse A');
    expect(gh?.xM).toBe(10);
    expect(gh?.widthM).toBeGreaterThan(10);
    const tank = layout.map.placements.find((p) => p.id === 'plc-tank-1');
    expect(tank).toBeTruthy();
    expect(tank!.xM).toBeLessThan(10);
  });

  it('generates parallel beds and orchard rows', () => {
    resetSiteLayoutSeq();
    const beds = generateParallelBeds(3, { lengthM: 8, widthM: 1.2 }, 1, 2, 2);
    expect(beds).toHaveLength(3);
    expect(beds[1].yM).toBeGreaterThan(beds[0].yM);

    const rows = generateOrchardRows({ rows: 2, treesPerRow: 4, rowSpacingM: 3, treeSpacingM: 2 });
    expect(rows).toHaveLength(2);
    expect(rows[0].groupCols).toBe(4);
  });

  it('generates grid beds and plant rows', () => {
    resetSiteLayoutSeq();
    const grid = generateGridBeds({ rows: 2, cols: 2, bed: { lengthM: 2, widthM: 1 } });
    expect(grid).toHaveLength(4);
    const row = generatePlantRow({
      startXM: 0,
      startYM: 0,
      endXM: 10,
      endYM: 0,
      spacingM: 1,
    });
    expect(row.kind).toBe('plant_group');
    expect(row.role).toBe('row');
  });

  it('links nested greenhouse object without deleting child space', () => {
    const layout = generateSiteLayout({
      spaceId: 'site-1',
      preset: 'SMALL_FARM',
      dimensions: { lengthM: 100, widthM: 50, heightM: 6 },
      childGreenhouseIds: ['gh-child'],
      templateId: 'small-farm-100x50',
    });
    const gh = layout.map.placements.find((p) => p.childSpaceId === 'gh-child');
    expect(gh).toBeTruthy();
    const { map, removedChildSpaceId } = deletePlacementPreservesChildSpace(layout.map, gh!.id);
    expect(map.placements.some((p) => p.id === gh!.id)).toBe(false);
    expect(removedChildSpaceId).toBe('gh-child');
  });

  it('binds outdoor soil sensor without duplicating device', () => {
    const map = createEmptySpaceMap('s1');
    const sensorPlacement = createPlacement({
      id: 'sensor-1',
      kind: 'sensor',
      role: 'soil_moisture',
      xM: 1.5,
      yM: 1.2,
      parentId: 'bed-3',
    });
    map.placements.push(
      {
        id: 'bed-3',
        kind: 'structure',
        role: 'grow_bed',
        xM: 1,
        yM: 1,
        widthM: 2,
        heightM: 1,
        rotationDeg: 0,
        label: 'Bed 3',
      },
      sensorPlacement,
    );
    const devices = [soilDevice()];
    const targets = listCompatibleBindTargets(sensorPlacement, devices, map);
    expect(targets.length).toBeGreaterThan(0);
    const placement = bindPlacement(sensorPlacement, targets[0]!);
    expect(placement.deviceId).toBe('dev-1');
    expect(devices).toHaveLength(1);
    const live = liveOutdoorReading(placement, devices);
    expect(live.hasData).toBe(true);
    expect(live.label).toContain('31');
    devices[0].isOnline = false;
    expect(liveOutdoorReading(placement, devices).label).toBe('Нет связи');
  });

  it('does not fabricate telemetry for unbound outdoor sensors', () => {
    const reading = liveOutdoorReading(
      { id: 's', kind: 'sensor', xM: 0, yM: 0, widthM: 0.1, heightM: 0.1, rotationDeg: 0 },
      [],
    );
    expect(reading.hasData).toBe(false);
  });

  it('answers factual outdoor spatial questions locally', () => {
    const layout = applyNamedPreset('small-farm-100x50', 'farm');
    expect(countBeds(layout.map).count).toBeGreaterThanOrEqual(6);
    const q = answerOutdoorSpatialQuestion('Сколько грядок?', layout.map, []);
    expect(q?.count).toBeGreaterThanOrEqual(6);
  });

  it('migrates indoor map without terrain while adding schema v3', () => {
    const indoor = createEmptySpaceMap('room-1');
    indoor.environmentPreset = 'GROW_ROOM';
    indoor.placements.push({
      id: 'p1',
      kind: 'plant',
      xM: 1,
      yM: 1,
      widthM: 0.3,
      heightM: 0.3,
      rotationDeg: 0,
    });
    const migrated = migrateSpatialSchema(indoor, { lengthM: 4, widthM: 3, heightM: 2.6 });
    expect(migrated.spatialSchemaVersion).toBe(CURRENT_SPATIAL_SCHEMA_VERSION);
    expect(migrated.terrainProfile).toBeUndefined();
    expect(migrated.placements).toHaveLength(1);
  });

  it('adapts grid step for outdoor scale', () => {
    expect(gridStepForScale(100, 50)).toBe(5);
    expect(gridStepForScale(4, 3)).toBe(0.2);
    expect(visualGridSteps({ lengthM: 100, widthM: 50 }).majorM).toBe(2.5);
  });
});
