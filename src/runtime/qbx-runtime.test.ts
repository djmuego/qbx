import { describe, expect, it } from 'vitest';
import type { Automation } from '../domain/automation/automation.types';
import type { Device } from '../domain/device/device.types';
import type { Space } from '../domain/space/space.types';
import { FakeClock } from './clock';
import { SeededRandomSource } from './random';
import { QbxRuntime } from './qbx-runtime';
import { LocalSimulatorGateway } from './gateway/local-simulator.gateway';

function makeSimulatorRuntime(clock = new FakeClock()): QbxRuntime {
  const random = new SeededRandomSource(1);
  return new QbxRuntime({
    clock,
    random,
    gateway: new LocalSimulatorGateway(clock, random),
  });
}

const SPACE_ID = 'space-1';
const DEVICE_ID = 'dev-1';
const SOIL_SENSOR_ID = 'sensor-soil';
const PUMP_OUTPUT_ID = 'out-pump';

function makeSpace(): Space {
  return { id: SPACE_ID, name: 'Main' } as Space;
}

function makeDevice(): Device {
  return {
    id: DEVICE_ID,
    spaceId: SPACE_ID,
    modelId: 'qbx-demo',
    name: 'Demo',
    customName: 'Demo',
    isOnline: true,
    inputs: [
      {
        id: SOIL_SENSOR_ID,
        type: 'soil_moisture',
        customName: 'Soil',
        unit: '%',
        currentValue: 40,
        value: 40,
        status: 'normal',
        showOnHome: true,
        visibleOnHome: true,
        history: [],
        optimalMin: 20,
        optimalMax: 80,
        portNumber: 1,
        hardwareLabel: 'IN1',
        name: 'Soil',
      },
    ],
    sensors: [],
    outputs: [
      {
        id: PUMP_OUTPUT_ID,
        type: 'watering',
        customName: 'Pump',
        state: false,
        isAuto: true,
        controlMode: 'auto',
        maxContinuousOnSeconds: 5,
        portNumber: 1,
        hardwareLabel: 'OUT1',
        name: 'Pump',
      },
    ],
  } as Device;
}

function makeAutomation(): Automation {
  return {
    id: 'auto-soil',
    spaceId: SPACE_ID,
    name: 'Soil pump',
    enabled: true,
    isEnabled: true,
    type: 'sensor',
    trigger: {
      type: 'sensor',
      sensorInputId: SOIL_SENSOR_ID,
      sensorDeviceId: DEVICE_ID,
      sensorName: 'Soil',
      sensorType: 'soil_moisture',
      condition: 'below',
      threshold: 30,
      thresholdUnit: '%',
      stopThreshold: 55,
    },
    action: {
      targetDeviceId: DEVICE_ID,
      targetOutputId: PUMP_OUTPUT_ID,
      equipmentName: 'Pump',
      actionType: 'turn_on',
    },
    sensorInputId: SOIL_SENSOR_ID,
    sensorDeviceId: DEVICE_ID,
    sensorName: 'Soil',
    sensorType: 'soil_moisture',
    condition: 'below',
    threshold: 30,
    thresholdUnit: '%',
    stopThreshold: 55,
    targetDeviceId: DEVICE_ID,
    targetOutputId: PUMP_OUTPUT_ID,
    equipmentName: 'Pump',
    actionType: 'turn_on',
  };
}

describe('QbxRuntime safety and commands', () => {
  it('forces outputs to safe OFF state on boot', () => {
    const device = makeDevice();
    device.outputs[0].state = true;
    const runtime = makeSimulatorRuntime();
    runtime.boot([makeSpace()], [device], [makeAutomation()]);
    const view = runtime.getView();
    expect(view.devices[0].outputs[0].state).toBe(false);
  });

  it('applies max continuous ON safety timeout', () => {
    const clock = new FakeClock(0);
    const runtime = makeSimulatorRuntime(clock);
    runtime.boot([makeSpace()], [makeDevice()], []);
    runtime.setOutputManual(DEVICE_ID, PUMP_OUTPUT_ID, true);
    clock.advanceMs(6_000);
    runtime.tick();
    expect(runtime.getView().devices[0].outputs[0].state).toBe(false);
  });

  it('restores automation control after return to auto', () => {
    const clock = new FakeClock(0);
    const runtime = makeSimulatorRuntime(clock);
    runtime.boot([makeSpace()], [makeDevice()], [makeAutomation()]);
    runtime.setOutputManual(DEVICE_ID, PUMP_OUTPUT_ID, true);
    runtime.returnOutputToAuto(DEVICE_ID, PUMP_OUTPUT_ID);
    runtime.tick();
    const output = runtime.getView().devices[0].outputs[0];
    expect(output.isAuto).toBe(true);
    expect(output.controlMode).toBe('auto');
  });

  it('keeps outputs OFF while emergency is active', () => {
    const clock = new FakeClock(0);
    const runtime = makeSimulatorRuntime(clock);
    runtime.boot([makeSpace()], [makeDevice()], [makeAutomation()]);
    runtime.emergencyOff(SPACE_ID);
    runtime.tick();
    expect(runtime.getView().devices[0].outputs[0].state).toBe(false);
    expect(runtime.isEmergencyActive(SPACE_ID)).toBe(true);
  });
});
