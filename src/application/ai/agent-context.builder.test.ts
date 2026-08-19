import { describe, expect, it } from 'vitest';
import { buildGrowContext } from './grow-context.builder';
import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';

const space: Space = {
  id: 'space-1',
  name: 'Теплица',
  type: 'greenhouse',
  areaM2: 12,
  volumeM3: 36,
};

const deviceWithSensor: Device = {
  id: 'dev-1',
  spaceId: 'space-1',
  modelId: 'qbx-hub',
  model: 'qbx-hub',
  modelName: 'QBX Hub',
  name: 'Hub',
  customName: 'Контроллер',
  status: 'online',
  isOnline: true,
  capabilities: {
    sensorInputCount: 4,
    outputCount: 4,
    supportedSensorTypes: ['temperature'],
    supportedOutputTypes: ['ventilation'],
    specialCapabilities: [],
  },
  sensors: [],
  inputs: [
    {
      id: 'in-1',
      portNumber: 1,
      hardwareLabel: 'IN1',
      type: 'temperature',
      name: 'Температура',
      customName: 'Температура воздуха',
      value: 24.5,
      currentValue: 24.5,
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
      id: 'out-1',
      portNumber: 1,
      hardwareLabel: 'OUT1',
      type: 'ventilation',
      name: 'Вентилятор',
      customName: 'Вентилятор',
      state: false,
      controlMode: 'auto',
      isAuto: true,
    },
  ],
  firmwareVersion: '0.0.0',
  serialNumber: 'SN-1',
  addedAt: '2026-08-18T00:00:00Z',
};

const baseInput = {
  getSensorHistory: () => [] as { time: string; value: number }[],
};

describe('buildGrowContext', () => {
  it('marks empty hardware product as waiting without live data', () => {
    const context = buildGrowContext({
      ...baseInput,
      space,
      growPhase: 'vegetation',
      devices: [],
      automations: [],
      isEmergencyActive: false,
    });

    expect(context.dataQuality.hasDevices).toBe(false);
    expect(context.dataQuality.hasLiveSensorData).toBe(false);
    expect(context.equipment).toHaveLength(0);
  });

  it('includes live sensor readings when values are finite', () => {
    const context = buildGrowContext({
      ...baseInput,
      space,
      growPhase: 'vegetation',
      devices: [deviceWithSensor],
      automations: [],
      isEmergencyActive: false,
    });

    expect(context.dataQuality.hasLiveSensorData).toBe(true);
    const temp = context.environment.sensors.find((s) => s.id === 'in-1');
    expect(temp?.value).toBe(24.5);
    expect(temp?.quality).toBe('fresh');
  });

  it('does not treat NaN sensor values as live data', () => {
    const device: Device = {
      ...deviceWithSensor,
      inputs: [
        {
          ...deviceWithSensor.inputs[0],
          currentValue: Number.NaN,
          value: Number.NaN,
        },
      ],
    };

    const context = buildGrowContext({
      ...baseInput,
      space,
      growPhase: 'vegetation',
      devices: [device],
      automations: [],
      isEmergencyActive: false,
    });

    expect(context.dataQuality.hasLiveSensorData).toBe(false);
    const temp = context.environment.sensors.find((s) => s.id === 'in-1');
    expect(temp?.value).toBeNull();
  });

  it('scopes automations to current space', () => {
    const automations: Automation[] = [
      {
        id: 'auto-1',
        spaceId: 'space-1',
        name: 'Вентиляция',
        enabled: true,
        isEnabled: true,
        type: 'sensor',
        trigger: {
          type: 'sensor',
          sensorInputId: 'in-1',
          sensorDeviceId: 'dev-1',
          sensorName: 'Температура',
          sensorType: 'temperature',
          condition: 'above',
          threshold: 26,
          thresholdUnit: '°C',
        },
        action: {
          targetDeviceId: 'dev-1',
          targetOutputId: 'out-1',
          equipmentName: 'Вентилятор',
          actionType: 'turn_on',
        },
        targetDeviceId: 'dev-1',
        targetOutputId: 'out-1',
        equipmentName: 'Вентилятор',
        actionType: 'turn_on',
        runtimeStatus: 'waiting',
      },
    ];

    const context = buildGrowContext({
      ...baseInput,
      space,
      growPhase: 'vegetation',
      devices: [deviceWithSensor],
      automations,
      isEmergencyActive: false,
    });

    expect(context.automations).toHaveLength(1);
    expect(context.automations[0]?.runtimeStatus).toBe('waiting');
  });

  it('derives VPD when temperature and humidity available', () => {
    const device: Device = {
      ...deviceWithSensor,
      inputs: [
        deviceWithSensor.inputs[0],
        {
          id: 'in-rh',
          portNumber: 2,
          hardwareLabel: 'IN2',
          type: 'humidity',
          name: 'RH',
          customName: 'Влажность',
          value: 60,
          currentValue: 60,
          unit: '%',
          optimalMin: 50,
          optimalMax: 70,
          status: 'normal',
          visibleOnHome: true,
          showOnHome: true,
          history: [],
        },
      ],
    };

    const context = buildGrowContext({
      ...baseInput,
      space,
      growPhase: 'vegetation',
      devices: [device],
      automations: [],
      isEmergencyActive: false,
    });

    const vpd = context.environment.derivedMetrics.find((m) => m.id === 'vpd');
    expect(vpd?.available).toBe(true);
    expect(vpd?.value).toBeGreaterThan(0);
  });
});
