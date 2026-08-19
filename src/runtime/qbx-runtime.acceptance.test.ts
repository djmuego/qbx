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
  return new QbxRuntime({ clock, random, gateway: new LocalSimulatorGateway(clock, random) });
}

const SPACE_ID = 'space-1';
const DEVICE_ID = 'dev-1';
const SOIL_SENSOR_ID = 'sensor-soil';
const PUMP_OUTPUT_ID = 'out-pump';

function makeSpace(): Space {
  return { id: SPACE_ID, name: 'Main' } as Space;
}

function makeDevice(soilValue = 38): Device {
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
        currentValue: soilValue,
        value: soilValue,
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
        portNumber: 1,
        hardwareLabel: 'OUT1',
        name: 'Pump',
      },
    ],
  } as Device;
}

function makeSoilAutomation(): Automation {
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

describe('QbxRuntime acceptance scenarios', () => {
  it('Scenario 1: low soil moisture turns pump ON and marks automation running', () => {
    const runtime = makeSimulatorRuntime(new FakeClock(0));
    runtime.boot([makeSpace()], [makeDevice(29)], [makeSoilAutomation()]);
    runtime.setSensorValue(SOIL_SENSOR_ID, 29);
    runtime.tick();

    const view = runtime.getView();
    expect(view.devices[0].outputs[0].state).toBe(true);
    expect(view.automations[0].runtimeStatus).toBe('running');
  });

  it('Scenario 2: manual override blocks automation until return to auto', () => {
    const runtime = makeSimulatorRuntime(new FakeClock(0));
    runtime.boot([makeSpace()], [makeDevice(29)], [makeSoilAutomation()]);
    runtime.setOutputManual(DEVICE_ID, PUMP_OUTPUT_ID, true);
    runtime.setSensorValue(SOIL_SENSOR_ID, 20);
    runtime.tick();
    expect(runtime.getView().devices[0].outputs[0].controlMode).toBe('manual');

    runtime.returnOutputToAuto(DEVICE_ID, PUMP_OUTPUT_ID);
    runtime.tick();
    const output = runtime.getView().devices[0].outputs[0];
    expect(output.isAuto).toBe(true);
    expect(output.state).toBe(true);
  });

  it('Scenario 3: emergency off prevents automation from turning outputs back on', () => {
    const runtime = makeSimulatorRuntime(new FakeClock(0));
    runtime.boot([makeSpace()], [makeDevice(29)], [makeSoilAutomation()]);
    runtime.emergencyOff(SPACE_ID);
    runtime.setSensorValue(SOIL_SENSOR_ID, 10);
    runtime.tick();

    expect(runtime.getView().devices[0].outputs[0].state).toBe(false);
    expect(runtime.isEmergencyActive(SPACE_ID)).toBe(true);
  });

  it('records SENSOR_READING events on sampled interval', () => {
    const clock = new FakeClock(0);
    const runtime = makeSimulatorRuntime(clock);
    runtime.boot([makeSpace()], [makeDevice()], []);
    runtime.tick();
    clock.advanceMs(61_000);
    runtime.tick();

    const events = runtime.getEvents().filter((event) => event.type === 'SENSOR_READING');
    expect(events.length).toBeGreaterThan(0);
  });

  it('skips automation commands when device is offline', () => {
    const runtime = makeSimulatorRuntime(new FakeClock(0));
    runtime.boot([makeSpace()], [makeDevice(29)], [makeSoilAutomation()]);
    runtime.setDeviceConnectionState(DEVICE_ID, 'offline');
    runtime.setSensorValue(SOIL_SENSOR_ID, 10);
    runtime.tick();

    expect(runtime.getView().devices[0].outputs[0].state).toBe(false);
    expect(runtime.getEvents().some((event) => event.type === 'DEVICE_OFFLINE')).toBe(true);
  });
});
