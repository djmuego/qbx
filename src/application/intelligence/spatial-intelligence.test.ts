import { describe, expect, it } from 'vitest';
import { analyzeSpatialLayout } from '../../application/intelligence/spatial-insight.engine';
import { buildHeatmap } from '../../application/intelligence/heatmap.service';
import { answerSpatialQuestion } from '../../application/intelligence/spatial-agent.local';
import { createEmptySpaceMap, createPlacement } from '../../domain/map/space-map.geometry';
import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';

const bounds = { lengthM: 6, widthM: 4, heightM: 2.5 };
const space: Space = { id: 's1', name: 'Tent', dimensions: bounds, areaM2: 24 };

function tempSensor(id: string, value: number, online = true): Device {
  return {
    id: `dev-${id}`,
    spaceId: 's1',
    modelId: 'hub',
    model: 'hub',
    modelName: 'Hub',
    name: 'Hub',
    customName: 'Hub',
    status: online ? 'online' : 'offline',
    isOnline: online,
    capabilities: {
      sensorInputCount: 1,
      outputCount: 0,
      supportedSensorTypes: ['temperature'],
      supportedOutputTypes: [],
      specialCapabilities: [],
    },
    sensors: [],
    inputs: [
      {
        id,
        portNumber: 1,
        hardwareLabel: 'IN1',
        type: 'temperature',
        name: 'Temp',
        customName: `Датчик ${id}`,
        value,
        currentValue: value,
        unit: '°C',
        optimalMin: 21,
        optimalMax: 27,
        status: 'normal',
        visibleOnHome: true,
        showOnHome: true,
        history: Array.from({ length: 8 }, (_, i) => ({ time: `${i}`, value })),
      },
    ],
    outputs: [],
    firmwareVersion: '0',
    serialNumber: 'x',
    addedAt: '2026-08-18',
  };
}

describe('Spatial intelligence', () => {
  it('flags a zone without a sensor', () => {
    const map = createEmptySpaceMap('s1');
    map.zones = [
      { id: 'za', name: 'Zone A', xM: 0, yM: 0, widthM: 3, heightM: 4 },
      { id: 'zb', name: 'Zone B', xM: 3, yM: 0, widthM: 3, heightM: 4 },
    ];
    map.placements = [
      createPlacement({ kind: 'sensor', sensorId: 't1', xM: 0.4, yM: 0.4, zoneId: 'za' }),
      createPlacement({ kind: 'plant', plantId: 'p1', xM: 4, yM: 1, zoneId: 'zb' }),
    ];
    const insights = analyzeSpatialLayout({ space, map, devices: [tempSensor('t1', 25)] });
    expect(insights.some((i) => i.kind === 'zone_without_sensor' && i.detail.includes('Zone B'))).toBe(true);
  });

  it('classifies third-sensor placement as GEOMETRY_BASED without telemetry contrast', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'sensor', sensorId: 't1', xM: 0.5, yM: 0.5 }),
      createPlacement({ kind: 'sensor', sensorId: 't2', xM: 1, yM: 0.5 }),
    ];
    const insights = analyzeSpatialLayout({ space, map, devices: [tempSensor('t1', 25), tempSensor('t2', 25.1)] });
    const rec = insights.find((i) => i.kind === 'placement_recommendation');
    expect(rec?.basis).toBe('GEOMETRY_BASED');
    expect(rec?.suggestedPosition).toBeDefined();
  });

  it('detects zone temperature difference from telemetry windows, not a single point', () => {
    const map = createEmptySpaceMap('s1');
    map.zones = [
      { id: 'za', name: 'Zone A', xM: 0, yM: 0, widthM: 3, heightM: 4 },
      { id: 'zb', name: 'Zone B', xM: 3, yM: 0, widthM: 3, heightM: 4 },
    ];
    map.placements = [
      createPlacement({ kind: 'sensor', sensorId: 'ta', xM: 0.5, yM: 1, zoneId: 'za' }),
      createPlacement({ kind: 'sensor', sensorId: 'tb', xM: 4, yM: 1, zoneId: 'zb' }),
    ];
    const a = tempSensor('ta', 25.1);
    a.inputs[0]!.history = Array.from({ length: 12 }, (_, i) => ({ time: `${i}`, value: 25 + i * 0.01 }));
    const b = tempSensor('tb', 28.2);
    b.inputs[0]!.history = Array.from({ length: 12 }, (_, i) => ({ time: `${i}`, value: 27.8 + i * 0.03 }));
    const insights = analyzeSpatialLayout({ space, map, devices: [a, b] });
    expect(insights.some((i) => i.kind === 'zone_temperature_difference')).toBe(true);
  });

  it('excludes stale and offline sensors from heatmap', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'sensor', sensorId: 'live', xM: 0.5, yM: 0.5 }),
      createPlacement({ kind: 'sensor', sensorId: 'off', xM: 4, yM: 2 }),
    ];
    const offline = tempSensor('off', 18, false);
    const heatmap = buildHeatmap({
      metric: 'temperature',
      map,
      devices: [tempSensor('live', 25), offline],
    });
    expect(heatmap.available).toBe(false);
    expect(heatmap.reason).toMatch(/недостаточно/i);
    expect(heatmap.measured.every((p) => p.sensorId !== 'off')).toBe(true);
  });

  it('refuses coldest-zone question with a single sensor', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [createPlacement({ kind: 'sensor', sensorId: 't1', xM: 1, yM: 1 })];
    const answer = answerSpatialQuestion('Где самая холодная зона?', {
      space,
      map,
      devices: [tempSensor('t1', 24)],
    });
    expect(answer).toMatch(/недостаточно данных/i);
  });
});
