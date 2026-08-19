import type { Clock } from '../clock';
import type { RandomSource } from '../random';
import type { Device } from '../../domain/device/device.types';
import type { EquipmentType } from '../../domain/equipment/equipment.types';
import type { SensorType } from '../../domain/sensor/sensor.types';
import type { CommandResult } from '../../domain/device/command.types';
import type { ConnectionState } from '../../domain/device/device-lifecycle.types';
import type {
  DeviceGateway,
  DeviceRuntimeState,
} from './device-gateway.contract';
import type { OutputRuntimeState, SensorReading } from '../types/runtime-state.types';

const SENSOR_BOUNDS: Record<SensorType, { min: number; max: number; drift: number }> = {
  temperature: { min: 16, max: 35, drift: 0.03 },
  humidity: { min: 35, max: 85, drift: 0.08 },
  soil_moisture: { min: 10, max: 90, drift: 0.05 },
  co2: { min: 400, max: 1500, drift: 2 },
  light: { min: 0, max: 100, drift: 0.5 },
  water_level: { min: 5, max: 100, drift: 0.04 },
  ph: { min: 4.5, max: 8, drift: 0.01 },
  ec: { min: 0.5, max: 3.5, drift: 0.01 },
  pressure: { min: 990, max: 1025, drift: 0.1 },
  other: { min: 0, max: 100, drift: 0.2 },
  generic: { min: 0, max: 100, drift: 0.2 },
  unused: { min: 0, max: 0, drift: 0 },
};

interface SimulatorDevice {
  config: Device;
  connectionState: ConnectionState;
  readings: Map<string, SensorReading>;
}

export class LocalSimulatorGateway implements DeviceGateway {
  readonly mode = 'simulator' as const;
  private devices = new Map<string, SimulatorDevice>();
  private outputStates = new Map<string, OutputRuntimeState>();

  constructor(
    private readonly clock: Clock,
    private readonly random: RandomSource,
  ) {}

  loadDevices(devices: Device[], outputs: OutputRuntimeState[]): void {
    this.devices.clear();
    this.outputStates.clear();

    for (const device of devices) {
      const readings = new Map<string, SensorReading>();
      for (const sensor of device.inputs) {
        if (sensor.type === 'unused') continue;
        readings.set(sensor.id, {
          sensorId: sensor.id,
          deviceId: device.id,
          spaceId: device.spaceId,
          type: sensor.type,
          value: sensor.currentValue,
          unit: sensor.unit,
          timestampMs: this.clock.nowMs(),
          quality: 'ok',
          optimalMin: sensor.optimalMin,
          optimalMax: sensor.optimalMax,
        });
      }
      this.devices.set(device.id, {
        config: device,
        connectionState: device.isOnline ? 'online' : 'offline',
        readings,
      });
    }

    for (const output of outputs) {
      this.outputStates.set(output.outputId, { ...output });
    }
  }

  setOutputRuntimeStates(outputs: OutputRuntimeState[]): void {
    this.outputStates.clear();
    for (const output of outputs) {
      this.outputStates.set(output.outputId, { ...output });
    }
  }

  getOutputRuntimeStates(): OutputRuntimeState[] {
    return [...this.outputStates.values()];
  }

  getAllSensorReadings(): SensorReading[] {
    const all: SensorReading[] = [];
    for (const device of this.devices.values()) {
      all.push(...device.readings.values());
    }
    return all;
  }

  async initialize(): Promise<void> {}

  async getDeviceState(deviceId: string): Promise<DeviceRuntimeState | null> {
    const device = this.devices.get(deviceId);
    if (!device) return null;
    const outputStates: Record<string, boolean> = {};
    for (const output of device.config.outputs) {
      outputStates[output.id] = this.outputStates.get(output.id)?.state ?? false;
    }
    return {
      deviceId,
      spaceId: device.config.spaceId,
      connectionState: device.connectionState,
      sensorReadings: [...device.readings.values()],
      outputStates,
    };
  }

  async setOutputState(deviceId: string, outputId: string, state: boolean): Promise<CommandResult> {
    const device = this.devices.get(deviceId);
    if (!device || device.connectionState === 'offline') {
      return {
        commandId: `cmd-${outputId}-${this.clock.nowMs()}`,
        status: 'failed',
        timestampMs: this.clock.nowMs(),
        error: `Device ${deviceId} is offline`,
      };
    }
    const current = this.outputStates.get(outputId);
    if (!current) {
      return {
        commandId: `cmd-${outputId}-${this.clock.nowMs()}`,
        status: 'failed',
        timestampMs: this.clock.nowMs(),
        error: 'Output not found',
      };
    }
    this.outputStates.set(outputId, {
      ...current,
      state,
      desiredState: state,
      reportedState: state,
      commandStatus: 'acknowledged',
      onSinceMs: state ? this.clock.nowMs() : null,
    });
    return {
      commandId: `cmd-${outputId}-${this.clock.nowMs()}`,
      status: 'acknowledged',
      timestampMs: this.clock.nowMs(),
    };
  }

  async getSensorValues(deviceId: string): Promise<SensorReading[]> {
    const device = this.devices.get(deviceId);
    if (!device) return [];
    return [...device.readings.values()];
  }

  async getConnectionState(deviceId: string): Promise<ConnectionState> {
    return this.devices.get(deviceId)?.connectionState ?? 'offline';
  }

  setDeviceConnectionState(deviceId: string, state: ConnectionState): void {
    const device = this.devices.get(deviceId);
    if (!device) return;
    device.connectionState = state;
    device.config.isOnline = state === 'online';
  }

  setSensorValue(sensorId: string, value: number): void {
    for (const device of this.devices.values()) {
      const reading = device.readings.get(sensorId);
      if (!reading) continue;
      device.readings.set(sensorId, {
        ...reading,
        value,
        timestampMs: this.clock.nowMs(),
        quality: 'ok',
      });
    }
  }

  async tickSimulation(deltaMs: number): Promise<void> {
    const activeEffects = this.collectActiveEffects();
    for (const device of this.devices.values()) {
      if (device.connectionState === 'offline') continue;
      for (const [sensorId, reading] of device.readings.entries()) {
        const sensor = device.config.inputs.find((s) => s.id === sensorId);
        if (!sensor || sensor.type === 'unused') continue;
        const bounds = SENSOR_BOUNDS[sensor.type];
        const effect = activeEffects.get(sensor.type) ?? 0;
        const noise = (this.random.next() - 0.5) * bounds.drift;
        const drying = sensor.type === 'soil_moisture' && effect === 0 ? -0.02 : 0;
        const nextValue = clamp(reading.value + effect + noise + drying, bounds.min, bounds.max);
        device.readings.set(sensorId, {
          ...reading,
          value: Number(nextValue.toFixed(sensor.type === 'temperature' || sensor.type === 'ph' || sensor.type === 'ec' ? 1 : 0)),
          timestampMs: this.clock.nowMs(),
          quality: 'ok',
        });
      }
    }
  }

  private collectActiveEffects(): Map<SensorType, number> {
    const effects = new Map<SensorType, number>();
    for (const outputState of this.outputStates.values()) {
      if (!outputState.state) continue;
      const device = this.devices.get(outputState.deviceId);
      const output = device?.config.outputs.find((o) => o.id === outputState.outputId);
      if (!output) continue;
      applyEffect(effects, output.type);
    }
    return effects;
  }
}

function applyEffect(effects: Map<SensorType, number>, equipmentType: EquipmentType): void {
  switch (equipmentType) {
    case 'heating':
      addEffect(effects, 'temperature', 0.05);
      break;
    case 'ventilation':
      addEffect(effects, 'temperature', -0.04);
      addEffect(effects, 'humidity', -0.02);
      break;
    case 'humidifier':
      addEffect(effects, 'humidity', 0.06);
      break;
    case 'watering':
      addEffect(effects, 'soil_moisture', 0.08);
      addEffect(effects, 'water_level', -0.03);
      break;
    case 'lighting':
      addEffect(effects, 'light', 2);
      break;
    case 'co2':
      addEffect(effects, 'co2', 5);
      break;
    default:
      break;
  }
}

function addEffect(effects: Map<SensorType, number>, type: SensorType, delta: number): void {
  effects.set(type, (effects.get(type) ?? 0) + delta);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
