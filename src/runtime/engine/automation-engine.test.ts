import { describe, expect, it } from 'vitest';
import type { Automation } from '../../domain/automation/automation.types';
import { FakeClock } from '../clock';
import type {
  AutomationRuntimeState,
  OutputRuntimeState,
  SensorReading,
  SpaceRuntimeState,
  TimerRuntimeState,
} from '../types/runtime-state.types';
import { AutomationEngine } from './automation-engine';

const SPACE_ID = 'space-1';
const DEVICE_ID = 'dev-1';
const SOIL_SENSOR_ID = 'sensor-soil';
const TEMP_SENSOR_ID = 'sensor-temp';
const PUMP_OUTPUT_ID = 'out-pump';
const FAN_OUTPUT_ID = 'out-fan';
const LIGHT_OUTPUT_ID = 'out-light';

function baseOutput(overrides: Partial<OutputRuntimeState> = {}): OutputRuntimeState {
  return {
    outputId: PUMP_OUTPUT_ID,
    deviceId: DEVICE_ID,
    spaceId: SPACE_ID,
    state: false,
    desiredState: false,
    reportedState: false,
    controlMode: 'auto',
    safeState: 'off',
    onSinceMs: null,
    ...overrides,
  };
}

function baseReading(overrides: Partial<SensorReading>): SensorReading {
  return {
    sensorId: SOIL_SENSOR_ID,
    deviceId: DEVICE_ID,
    spaceId: SPACE_ID,
    type: 'soil_moisture',
    value: 40,
    unit: '%',
    timestampMs: 1_000,
    quality: 'ok',
    optimalMin: 20,
    optimalMax: 80,
    ...overrides,
  };
}

function sensorAutomation(overrides: Partial<Automation> = {}): Automation {
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
    ...overrides,
  };
}

function tempAutomation(overrides: Partial<Automation> = {}): Automation {
  return {
    id: 'auto-temp',
    spaceId: SPACE_ID,
    name: 'Temperature fan',
    enabled: true,
    isEnabled: true,
    type: 'sensor',
    trigger: {
      type: 'sensor',
      sensorInputId: TEMP_SENSOR_ID,
      sensorDeviceId: DEVICE_ID,
      sensorName: 'Temperature',
      sensorType: 'temperature',
      condition: 'above',
      threshold: 28,
      thresholdUnit: '°C',
      stopThreshold: 25,
    },
    action: {
      targetDeviceId: DEVICE_ID,
      targetOutputId: FAN_OUTPUT_ID,
      equipmentName: 'Fan',
      actionType: 'turn_on',
    },
    sensorInputId: TEMP_SENSOR_ID,
    sensorDeviceId: DEVICE_ID,
    sensorName: 'Temperature',
    sensorType: 'temperature',
    condition: 'above',
    threshold: 28,
    thresholdUnit: '°C',
    stopThreshold: 25,
    targetDeviceId: DEVICE_ID,
    targetOutputId: FAN_OUTPUT_ID,
    equipmentName: 'Fan',
    actionType: 'turn_on',
    ...overrides,
  };
}

function scheduleAutomation(overrides: Partial<Automation> = {}): Automation {
  return {
    id: 'auto-light',
    spaceId: SPACE_ID,
    name: 'Grow light schedule',
    enabled: true,
    isEnabled: true,
    type: 'schedule',
    trigger: {
      type: 'schedule',
      scheduleDays: [],
      onTime: '07:00',
      offTime: '21:00',
    },
    action: {
      targetDeviceId: DEVICE_ID,
      targetOutputId: LIGHT_OUTPUT_ID,
      equipmentName: 'Light',
      actionType: 'turn_on',
    },
    scheduleDays: [],
    onTime: '07:00',
    offTime: '21:00',
    targetDeviceId: DEVICE_ID,
    targetOutputId: LIGHT_OUTPUT_ID,
    equipmentName: 'Light',
    actionType: 'turn_on',
    ...overrides,
  };
}

function timerAutomation(overrides: Partial<Automation> = {}): Automation {
  return {
    id: 'auto-timer',
    spaceId: SPACE_ID,
    name: 'Pulse timer',
    enabled: true,
    isEnabled: true,
    type: 'timer',
    trigger: {
      type: 'timer',
      intervalMinutes: 60,
      durationSeconds: 30,
    },
    action: {
      targetDeviceId: DEVICE_ID,
      targetOutputId: PUMP_OUTPUT_ID,
      equipmentName: 'Pump',
      actionType: 'turn_on',
    },
    intervalMinutes: 60,
    durationSeconds: 30,
    targetDeviceId: DEVICE_ID,
    targetOutputId: PUMP_OUTPUT_ID,
    equipmentName: 'Pump',
    actionType: 'turn_on',
    ...overrides,
  };
}

function evaluate(
  automations: Automation[],
  options: {
    readings?: Record<string, SensorReading>;
    outputs?: Record<string, OutputRuntimeState>;
    spaces?: Record<string, SpaceRuntimeState>;
    timers?: Record<string, TimerRuntimeState>;
    clock?: FakeClock;
  } = {},
) {
  const clock = options.clock ?? new FakeClock();
  const engine = new AutomationEngine();
  return engine.evaluate({
    clock,
    devices: [],
    automations,
    sensorReadings: options.readings ?? {},
    outputStates: options.outputs ?? {
      [PUMP_OUTPUT_ID]: baseOutput(),
      [FAN_OUTPUT_ID]: baseOutput({ outputId: FAN_OUTPUT_ID }),
      [LIGHT_OUTPUT_ID]: baseOutput({ outputId: LIGHT_OUTPUT_ID }),
    },
    spaceStates: options.spaces ?? { [SPACE_ID]: { spaceId: SPACE_ID, emergencyActive: false } },
    timerStates: options.timers ?? {},
    simulationEnabled: true,
  });
}

describe('AutomationEngine', () => {
  it('turns pump ON when soil moisture drops below trigger threshold', () => {
    const result = evaluate([sensorAutomation()], {
      readings: {
        [SOIL_SENSOR_ID]: baseReading({ value: 29 }),
      },
    });

    expect(result.outputCommands).toHaveLength(1);
    expect(result.outputCommands[0].desiredState).toBe(true);
    expect(result.automationStates['auto-soil'].runtimeStatus).toBe('running');
  });

  it('turns pump OFF when soil moisture reaches stop threshold', () => {
    const result = evaluate([sensorAutomation()], {
      readings: {
        [SOIL_SENSOR_ID]: baseReading({ value: 55 }),
      },
      outputs: {
        [PUMP_OUTPUT_ID]: baseOutput({ state: true, onSinceMs: 100 }),
      },
    });

    expect(result.outputCommands[0].desiredState).toBe(false);
    expect(result.automationStates['auto-soil'].runtimeStatus).toBe('waiting');
  });

  it('turns fan ON when temperature exceeds high threshold', () => {
    const result = evaluate([tempAutomation()], {
      readings: {
        [TEMP_SENSOR_ID]: baseReading({
          sensorId: TEMP_SENSOR_ID,
          type: 'temperature',
          value: 29,
          unit: '°C',
        }),
      },
      outputs: {
        [FAN_OUTPUT_ID]: baseOutput({ outputId: FAN_OUTPUT_ID }),
      },
    });

    expect(result.outputCommands[0].outputId).toBe(FAN_OUTPUT_ID);
    expect(result.outputCommands[0].desiredState).toBe(true);
  });

  it('keeps hysteresis band stable without oscillation', () => {
    const low = evaluate([sensorAutomation()], {
      readings: { [SOIL_SENSOR_ID]: baseReading({ value: 29 }) },
    });
    expect(low.outputCommands[0].desiredState).toBe(true);

    const midOff = evaluate([sensorAutomation()], {
      readings: { [SOIL_SENSOR_ID]: baseReading({ value: 32 }) },
      outputs: { [PUMP_OUTPUT_ID]: baseOutput({ state: false }) },
    });
    expect(midOff.outputCommands).toHaveLength(0);
    expect(midOff.automationStates['auto-soil'].runtimeStatus).toBe('waiting');

    const midOn = evaluate([sensorAutomation()], {
      readings: { [SOIL_SENSOR_ID]: baseReading({ value: 32 }) },
      outputs: { [PUMP_OUTPUT_ID]: baseOutput({ state: true, onSinceMs: 100 }) },
    });
    expect(midOn.outputCommands).toHaveLength(0);
    expect(midOn.automationStates['auto-soil'].runtimeStatus).toBe('running');
  });

  it('activates schedule automation inside daily window', () => {
    const clock = new FakeClock();
    clock.setTime(10, 0);
    const result = evaluate([scheduleAutomation()], { clock });

    expect(result.outputCommands[0].desiredState).toBe(true);
    expect(result.automationStates['auto-light'].runtimeStatus).toBe('running');
  });

  it('supports overnight schedule windows', () => {
    const clock = new FakeClock();
    const overnight = scheduleAutomation({ onTime: '20:00', offTime: '06:00' });

    clock.setTime(23, 0);
    expect(evaluate([overnight], { clock }).outputCommands[0].desiredState).toBe(true);

    clock.setTime(3, 0);
    expect(evaluate([overnight], { clock }).outputCommands[0].desiredState).toBe(true);

    clock.setTime(12, 0);
    const midday = evaluate([overnight], { clock });
    expect(midday.outputCommands).toHaveLength(0);
    expect(midday.automationStates['auto-light'].runtimeStatus).toBe('waiting');
  });

  it('runs cyclic timer for configured duration', () => {
    const clock = new FakeClock();
    clock.setMs(0);
    const engine = new AutomationEngine();
    const automation = timerAutomation();

    const first = engine.evaluate({
      clock,
      devices: [],
      automations: [automation],
      sensorReadings: {},
      outputStates: { [PUMP_OUTPUT_ID]: baseOutput() },
      spaceStates: { [SPACE_ID]: { spaceId: SPACE_ID, emergencyActive: false } },
      timerStates: {},
      simulationEnabled: true,
    });
    expect(first.outputCommands[0].desiredState).toBe(true);

    clock.advanceMs(15_000);
    const active = engine.evaluate({
      clock,
      devices: [],
      automations: [automation],
      sensorReadings: {},
      outputStates: { [PUMP_OUTPUT_ID]: baseOutput({ state: true, onSinceMs: 0 }) },
      spaceStates: { [SPACE_ID]: { spaceId: SPACE_ID, emergencyActive: false } },
      timerStates: first.timerStates,
      simulationEnabled: true,
    });
    expect(active.automationStates['auto-timer'].runtimeStatus).toBe('running');

    clock.advanceMs(20_000);
    const finished = engine.evaluate({
      clock,
      devices: [],
      automations: [automation],
      sensorReadings: {},
      outputStates: { [PUMP_OUTPUT_ID]: baseOutput({ state: true, onSinceMs: 0 }) },
      spaceStates: { [SPACE_ID]: { spaceId: SPACE_ID, emergencyActive: false } },
      timerStates: active.timerStates,
      simulationEnabled: true,
    });
    expect(finished.outputCommands[0]?.desiredState ?? false).toBe(false);
  });

  it('does nothing for disabled automation', () => {
    const result = evaluate([sensorAutomation({ isEnabled: false, enabled: false })], {
      readings: { [SOIL_SENSOR_ID]: baseReading({ value: 10 }) },
    });

    expect(result.outputCommands).toHaveLength(0);
    expect(result.automationStates['auto-soil'].runtimeStatus).toBe('disabled');
  });

  it('does not override manual output control', () => {
    const result = evaluate([sensorAutomation()], {
      readings: { [SOIL_SENSOR_ID]: baseReading({ value: 10 }) },
      outputs: {
        [PUMP_OUTPUT_ID]: baseOutput({ controlMode: 'manual', state: false }),
      },
    });

    expect(result.outputCommands).toHaveLength(0);
    expect(result.automationStates['auto-soil'].runtimeStatus).toBe('waiting');
  });

  it('blocks automation while emergency is active', () => {
    const result = evaluate([sensorAutomation()], {
      readings: { [SOIL_SENSOR_ID]: baseReading({ value: 10 }) },
      spaces: { [SPACE_ID]: { spaceId: SPACE_ID, emergencyActive: true } },
    });

    expect(result.outputCommands).toHaveLength(0);
    expect(result.automationStates['auto-soil'].runtimeStatus).toBe('waiting');
  });

  it('enters error state for stale sensor readings', () => {
    const result = evaluate([sensorAutomation()], {
      readings: {
        [SOIL_SENSOR_ID]: baseReading({ value: 10, quality: 'stale' }),
      },
    });

    expect(result.outputCommands).toHaveLength(0);
    expect(result.automationStates['auto-soil'].runtimeStatus).toBe('error');
  });

  it('rejects automation when target output is in another space', () => {
    const result = evaluate(
      [sensorAutomation({ spaceId: 'space-2', targetOutputId: PUMP_OUTPUT_ID })],
      {
        readings: { [SOIL_SENSOR_ID]: baseReading({ value: 10, spaceId: 'space-1' }) },
        outputs: {
          [PUMP_OUTPUT_ID]: baseOutput({ spaceId: 'space-1' }),
        },
        spaces: {
          'space-1': { spaceId: 'space-1', emergencyActive: false },
          'space-2': { spaceId: 'space-2', emergencyActive: false },
        },
      },
    );

    expect(result.outputCommands).toHaveLength(0);
    expect(result.automationStates['auto-soil'].runtimeStatus).toBe('error');
  });
});

describe('AutomationEngine priority', () => {
  it('uses deterministic priority when multiple automations target one output', () => {
    const lowPriority = sensorAutomation({ id: 'auto-low', priority: 1 });
    const highPriority = sensorAutomation({ id: 'auto-high', priority: 10, name: 'High priority pump' });
    const result = evaluate([lowPriority, highPriority], {
      readings: { [SOIL_SENSOR_ID]: baseReading({ value: 20 }) },
    });

    expect(result.outputCommands).toHaveLength(1);
    expect(result.outputCommands[0].automationId).toBe('auto-high');
  });
});
