import { describe, expect, it } from 'vitest';
import { listUnboundPorts } from './map-palette';
import { createEmptySpaceMap, createPlacement } from './space-map.geometry';
import type { Device } from '../device/device.types';

const device: Device = {
  id: 'dev-1',
  spaceId: 's1',
  modelId: 'qbx-hub',
  model: 'qbx-hub',
  modelName: 'Hub',
  name: 'Hub',
  customName: 'Hub',
  status: 'online',
  isOnline: true,
  capabilities: {
    sensorInputCount: 1,
    outputCount: 1,
    supportedSensorTypes: ['temperature'],
    supportedOutputTypes: ['ventilation'],
    specialCapabilities: [],
  },
  sensors: [],
  inputs: [
    {
      id: 't1',
      portNumber: 1,
      hardwareLabel: 'IN1',
      type: 'temperature',
      name: 'Temp',
      customName: 'Temp',
      value: 24,
      currentValue: 24,
      unit: '°C',
      optimalMin: 21,
      optimalMax: 26,
      status: 'normal',
      visibleOnHome: true,
      showOnHome: true,
      history: [],
    },
  ],
  outputs: [
    {
      id: 'fan1',
      portNumber: 1,
      hardwareLabel: 'OUT1',
      type: 'ventilation',
      name: 'Fan',
      customName: 'Fan',
      state: false,
      controlMode: 'manual',
      isAuto: false,
    },
  ],
  firmwareVersion: '0',
  serialNumber: 'x',
  addedAt: '2026-08-18',
};

describe('map palette unbound ports', () => {
  it('lists hub, sensor and output until they are placed', () => {
    const empty = createEmptySpaceMap('s1');
    expect(listUnboundPorts([device], empty).map((p) => p.key)).toEqual(['hub:dev-1', 'sensor:t1', 'output:fan1']);

    const mapped = createEmptySpaceMap('s1');
    mapped.placements = [
      createPlacement({ kind: 'hub', deviceId: 'dev-1' }),
      createPlacement({ kind: 'sensor', deviceId: 'dev-1', sensorId: 't1' }),
      createPlacement({ kind: 'equipment', deviceId: 'dev-1', outputId: 'fan1' }),
    ];
    expect(listUnboundPorts([device], mapped)).toEqual([]);
  });
});
