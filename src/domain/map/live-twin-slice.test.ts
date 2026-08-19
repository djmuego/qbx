import { describe, expect, it } from 'vitest';
import { createEmptySpaceMap, createPlacement } from './space-map.geometry';
import { spaceMapSchema } from '../../data/schemas/qbx.schemas';
import { unbindDeviceFromMap } from './spatial-device-bind';
import {
  bindPlacement,
  listCompatibleBindTargets,
  unbindPlacement,
} from './spatial-device-bind';
import { buildLiveTwinLabel } from './live-twin-label';
import { environmentTypeFromSpace, isOutdoorEnvironment } from './environment.types';
import { generateEnvironment } from '../../application/map/environment-generator';
import { MATERIAL_REGISTRY } from '../../application/map/material-registry';
import { resolvePlacementIdForFocus, type SpatialFocusTarget } from './spatial-focus';
import type { Device } from '../device/device.types';
import type { RuntimeSnapshot } from '../../runtime/types/runtime-state.types';
import type { Sensor } from '../sensor/sensor.types';
import type { Output } from '../equipment/equipment.types';

function sensor(partial: Partial<Sensor> & Pick<Sensor, 'id' | 'type' | 'name'>): Sensor {
  return {
    portNumber: 1,
    hardwareLabel: 'IN1',
    customName: partial.name,
    value: Number.NaN,
    currentValue: Number.NaN,
    unit: '°C',
    optimalMin: 21,
    optimalMax: 26,
    status: 'normal',
    visibleOnHome: true,
    showOnHome: true,
    history: [],
    ...partial,
  };
}

function output(partial: Partial<Output> & Pick<Output, 'id' | 'type' | 'name'>): Output {
  return {
    portNumber: 1,
    hardwareLabel: 'OUT1',
    customName: partial.name,
    state: false,
    controlMode: 'auto',
    isAuto: true,
    ...partial,
  };
}

function device(overrides: Partial<Device> = {}): Device {
  return {
    id: 'dev-power',
    spaceId: 's1',
    modelId: 'qbx-power-4',
    model: 'qbx-power-4',
    modelName: 'QBX Power 4',
    name: 'QBX Power 4',
    customName: 'QBX Power 4',
    status: 'online',
    isOnline: true,
    capabilities: {
      sensorInputCount: 2,
      outputCount: 2,
      supportedSensorTypes: ['temperature', 'humidity'],
      supportedOutputTypes: ['ventilation', 'lighting'],
      specialCapabilities: [],
    },
    sensors: [],
    inputs: [
      sensor({ id: 'in-temp', type: 'temperature', name: 'Climate Sensor #2', currentValue: 27.1, value: 27.1, hardwareLabel: 'IN1' }),
      sensor({
        id: 'in-rh',
        type: 'humidity',
        name: 'Humidity',
        currentValue: 63,
        value: 63,
        unit: '%',
        hardwareLabel: 'IN2',
        portNumber: 2,
        optimalMin: 40,
        optimalMax: 70,
      }),
    ],
    outputs: [
      output({ id: 'out-fan', type: 'ventilation', name: 'Вытяжка', hardwareLabel: 'OUT2', portNumber: 2, state: true }),
      output({ id: 'out-light', type: 'lighting', name: 'Grow Light', hardwareLabel: 'OUT1', state: true }),
    ],
    firmwareVersion: '1',
    serialNumber: 'x',
    addedAt: '2026-08-18',
    ...overrides,
  };
}

function snapshot(partial: Partial<RuntimeSnapshot> = {}): RuntimeSnapshot {
  return {
    sensorReadings: {
      'in-temp': {
        sensorId: 'in-temp',
        deviceId: 'dev-power',
        spaceId: 's1',
        type: 'temperature',
        value: 27.1,
        unit: '°C',
        timestampMs: 1,
        quality: 'ok',
        optimalMin: 21,
        optimalMax: 26,
      },
      'in-rh': {
        sensorId: 'in-rh',
        deviceId: 'dev-power',
        spaceId: 's1',
        type: 'humidity',
        value: 63,
        unit: '%',
        timestampMs: 1,
        quality: 'ok',
        optimalMin: 40,
        optimalMax: 70,
      },
    },
    outputStates: {
      'out-fan': {
        outputId: 'out-fan',
        deviceId: 'dev-power',
        spaceId: 's1',
        state: true,
        desiredState: true,
        reportedState: true,
        commandStatus: 'acknowledged',
        controlMode: 'auto',
        safeState: 'off',
        onSinceMs: 1,
      },
      'out-light': {
        outputId: 'out-light',
        deviceId: 'dev-power',
        spaceId: 's1',
        state: true,
        desiredState: true,
        reportedState: true,
        commandStatus: 'acknowledged',
        controlMode: 'auto',
        safeState: 'off',
        onSinceMs: 1,
      },
    },
    automationStates: {},
    timerStates: {},
    spaceStates: {},
    ...partial,
  };
}

describe('Environment + Live Twin thin slice', () => {
  it('binds a sensor endpoint and rejects a lighting output', () => {
    const map = createEmptySpaceMap('s1');
    const placement = createPlacement({ kind: 'sensor', label: 'Climate Sensor' });
    const targets = listCompatibleBindTargets(placement, [device()], map);
    expect(targets.some((t) => t.sensorId === 'in-temp')).toBe(true);
    expect(targets.some((t) => t.outputId === 'out-light')).toBe(false);
    const bound = bindPlacement(placement, targets.find((t) => t.sensorId === 'in-temp')!);
    expect(bound.deviceId).toBe('dev-power');
    expect(bound.sensorId).toBe('in-temp');
    expect(bound.outputId).toBeUndefined();
  });

  it('binds a light to a lighting output and a fan to ventilation', () => {
    const map = createEmptySpaceMap('s1');
    const light = createPlacement({ kind: 'light' });
    const fan = createPlacement({ kind: 'equipment', role: 'exhaust' });
    const lightTargets = listCompatibleBindTargets(light, [device()], map);
    const fanTargets = listCompatibleBindTargets(fan, [device()], map);
    expect(lightTargets.map((t) => t.outputId)).toEqual(['out-light']);
    expect(fanTargets.map((t) => t.outputId)).toEqual(['out-fan']);
    expect(bindPlacement(fan, fanTargets[0]!).outputId).toBe('out-fan');
  });

  it('binds a hub to the device, not a port', () => {
    const hub = createPlacement({ kind: 'hub' });
    const targets = listCompatibleBindTargets(hub, [device()], createEmptySpaceMap('s1'));
    expect(targets).toHaveLength(1);
    expect(targets[0]?.kind).toBe('device');
    const bound = bindPlacement(hub, targets[0]!);
    expect(bound.deviceId).toBe('dev-power');
    expect(bound.sensorId).toBeUndefined();
    expect(bound.outputId).toBeUndefined();
  });

  it('unbind leaves Device intact and only clears placement binding', () => {
    const hardware = device();
    const placement = bindPlacement(
      createPlacement({ kind: 'sensor' }),
      listCompatibleBindTargets(createPlacement({ kind: 'sensor' }), [hardware], createEmptySpaceMap('s1'))[0]!,
    );
    const next = unbindPlacement(placement);
    expect(next.deviceId).toBeUndefined();
    expect(next.sensorId).toBeUndefined();
    expect(hardware.id).toBe('dev-power');
    expect(hardware.inputs).toHaveLength(2);
  });

  it('deleting a SpatialObject leaves Device intact', () => {
    const hardware = device();
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'sensor', id: 'plc-1', deviceId: hardware.id, sensorId: 'in-temp' }),
      createPlacement({ kind: 'plant', id: 'plc-2' }),
    ];
    const next = { ...map, placements: map.placements.filter((p) => p.id !== 'plc-1') };
    expect(next.placements).toHaveLength(1);
    expect(hardware.inputs[0]?.id).toBe('in-temp');
  });

  it('Device removal clears binding safely', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ kind: 'sensor', deviceId: 'dev-power', sensorId: 'in-temp', xM: 1, yM: 1 }),
    ];
    const next = unbindDeviceFromMap(map, 'dev-power');
    expect(next.placements[0]?.kind).toBe('sensor');
    expect(next.placements[0]?.deviceId).toBeUndefined();
    expect(next.placements[0]?.sensorId).toBeUndefined();
  });

  it('persists binding through SpaceMap schema', () => {
    const map = createEmptySpaceMap('s1');
    const bound = bindPlacement(
      createPlacement({ kind: 'sensor', xM: 0.4, yM: 0.5 }),
      listCompatibleBindTargets(createPlacement({ kind: 'sensor' }), [device()], map)[0]!,
    );
    map.placements = [bound];
    const parsed = spaceMapSchema.parse(map);
    expect(parsed.placements[0]?.deviceId).toBe('dev-power');
    expect(parsed.placements[0]?.sensorId).toBe('in-temp');
  });

  it('binding migration keeps coordinates when ids are present', () => {
    const parsed = spaceMapSchema.parse({
      spaceId: 's1',
      schemaVersion: 1,
      gridStepM: 0.1,
      northOffsetDeg: 0,
      zones: [],
      placements: [
        {
          id: 'p1',
          kind: 'sensor',
          xM: 0.8,
          yM: 1.2,
          widthM: 0.1,
          heightM: 0.1,
          rotationDeg: 0,
          deviceId: 'dev-power',
          sensorId: 'in-temp',
        },
      ],
      updatedAt: '2026-08-18T18:00:00+07:00',
    });
    expect(parsed.placements[0]?.xM).toBe(0.8);
    expect(parsed.placements[0]?.deviceId).toBe('dev-power');
  });

  it('shows fresh sensor values and hides stale as current', () => {
    const placement = createPlacement({
      kind: 'sensor',
      label: 'Climate Sensor #2',
      deviceId: 'dev-power',
      sensorId: 'in-temp',
    });
    const live = buildLiveTwinLabel(placement, [device()], snapshot());
    expect(live?.readingLine).toContain('27.1');
    expect(live?.readingLine).toContain('63');
    expect(live?.statusLine).toMatch(/ONLINE|Online/i);

    const stale = buildLiveTwinLabel(
      placement,
      [device()],
      snapshot({
        sensorReadings: {
          'in-temp': {
            sensorId: 'in-temp',
            deviceId: 'dev-power',
            spaceId: 's1',
            type: 'temperature',
            value: 27.1,
            unit: '°C',
            timestampMs: 1,
            quality: 'stale',
            optimalMin: 21,
            optimalMax: 26,
          },
        },
      }),
    );
    expect(stale?.readingLine).toBe('Данные устарели');
    expect(stale?.readingLine).not.toContain('27.1');
  });

  it('offline device shows Нет связи, missing reading shows Нет данных', () => {
    const placement = createPlacement({
      kind: 'sensor',
      deviceId: 'dev-power',
      sensorId: 'in-temp',
    });
    const offline = buildLiveTwinLabel(placement, [device({ isOnline: false, status: 'offline' })], snapshot());
    expect(offline?.readingLine).toBe('Нет связи');
    expect(offline?.visualState).toBe('offline');

    const empty = buildLiveTwinLabel(placement, [device()], snapshot({ sensorReadings: {} }));
    expect(empty?.readingLine).toBe('Нет данных');
  });

  it('uses reportedState, not desiredState, and surfaces pending/failed', () => {
    const placement = createPlacement({
      kind: 'equipment',
      role: 'exhaust',
      label: 'Exhaust Fan',
      deviceId: 'dev-power',
      outputId: 'out-fan',
    });
    const live = buildLiveTwinLabel(
      placement,
      [device()],
      snapshot({
        outputStates: {
          'out-fan': {
            outputId: 'out-fan',
            deviceId: 'dev-power',
            spaceId: 's1',
            state: false,
            desiredState: true,
            reportedState: false,
            commandStatus: 'acknowledged',
            controlMode: 'auto',
            safeState: 'off',
            onSinceMs: null,
          },
        },
      }),
    );
    expect(live?.statusLine).toContain('OFF');
    expect(live?.statusLine).not.toContain('ON ·');

    const pending = buildLiveTwinLabel(
      placement,
      [device()],
      snapshot({
        outputStates: {
          'out-fan': {
            outputId: 'out-fan',
            deviceId: 'dev-power',
            spaceId: 's1',
            state: false,
            desiredState: true,
            reportedState: false,
            commandStatus: 'pending',
            controlMode: 'manual',
            safeState: 'off',
            onSinceMs: null,
          },
        },
      }),
    );
    expect(pending?.statusLine).toBe('Проверяется...');
    expect(pending?.visualState).toBe('manual');

    const failed = buildLiveTwinLabel(
      placement,
      [device()],
      snapshot({
        outputStates: {
          'out-fan': {
            outputId: 'out-fan',
            deviceId: 'dev-power',
            spaceId: 's1',
            state: false,
            desiredState: true,
            reportedState: false,
            commandStatus: 'failed',
            controlMode: 'auto',
            safeState: 'off',
            onSinceMs: null,
          },
        },
      }),
    );
    expect(failed?.statusLine).toBe('Ошибка команды');
    expect(failed?.visualState).toBe('error');
  });

  it('unbound sensor is labeled without fake values', () => {
    const label = buildLiveTwinLabel(createPlacement({ kind: 'sensor' }), [device()], snapshot());
    expect(label?.bound).toBe(false);
    expect(label?.readingLine).toBe('Не связан с устройством');
  });

  it('SpatialFocusTarget resolves a placement for an offline device', () => {
    const map = createEmptySpaceMap('s1');
    map.placements = [
      createPlacement({ id: 'plc-fan', kind: 'equipment', role: 'exhaust', deviceId: 'dev-power', outputId: 'out-fan' }),
    ];
    const target: SpatialFocusTarget = { spaceId: 's1', deviceId: 'dev-power', reason: 'offline' };
    expect(resolvePlacementIdForFocus(map, target)).toBe('plc-fan');
  });

  it('maps outdoor space types without locking the engine to indoor', () => {
    expect(environmentTypeFromSpace('grow_tent')).toBe('grow_tent');
    expect(environmentTypeFromSpace('grow_room')).toBe('grow_room');
    expect(environmentTypeFromSpace('greenhouse')).toBe('greenhouse');
    expect(environmentTypeFromSpace('outdoor')).toBe('outdoor_garden');
    expect(isOutdoorEnvironment('open_field')).toBe(true);
    expect(isOutdoorEnvironment('farm_zone')).toBe(true);
    expect(isOutdoorEnvironment('grow_tent')).toBe(false);
    const outdoor = generateEnvironment('OUTDOOR_ZONE', { lengthM: 12, widthM: 8, heightM: 3 });
    expect(outdoor.parts.every((p) => p.kind === 'floor')).toBe(true);
  });

  it('Grow Tent has fabric, mylar, poles and tray; greenhouse has glass ribs', () => {
    expect(MATERIAL_REGISTRY.growTentFabric).toBeDefined();
    expect(MATERIAL_REGISTRY.reflectiveMylar).toBeDefined();
    expect(MATERIAL_REGISTRY.greenhouseGlass).toBeDefined();
    const tent = generateEnvironment('GROW_TENT', { lengthM: 1.2, widthM: 1.2, heightM: 2 });
    expect(tent.parts.some((p) => p.kind === 'frame')).toBe(true);
    expect(tent.parts.some((p) => p.kind === 'mylar')).toBe(true);
    expect(tent.parts.some((p) => p.kind === 'tray')).toBe(true);
    expect(tent.parts.some((p) => p.material === 'growTentFabric' || p.material === 'tent_canvas')).toBe(true);
    const gh = generateEnvironment('GREENHOUSE', { lengthM: 8, widthM: 4, heightM: 3.2 });
    expect(gh.parts.filter((p) => p.kind === 'frame').length).toBeGreaterThan(1);
    expect(gh.parts.some((p) => p.material === 'greenhouseGlass' || p.material === 'glass_panel')).toBe(true);
  });
});
