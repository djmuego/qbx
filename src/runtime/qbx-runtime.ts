import type { Automation } from '../domain/automation/automation.types';
import type { Device } from '../domain/device/device.types';
import type { Space } from '../domain/space/space.types';
import type { Clock } from './clock';
import type { RandomSource } from './random';
import { EventLog } from './events/event-log';
import { HistoryBuffer } from './telemetry/history-buffer';
import { AutomationEngine, evaluateSensorStatus, markStaleSensors, type OutputCommand } from './engine/automation-engine';
import type { DeviceGateway } from './gateway/device-gateway.contract';
import { createGateway } from './gateway/gateway-factory';
import type { ConnectionState } from '../domain/device/device-lifecycle.types';
import type {
  AutomationRuntimeState,
  OutputRuntimeState,
  RuntimeSnapshot,
  SensorReading,
  SpaceRuntimeState,
  TimerRuntimeState,
} from './types/runtime-state.types';
import { DEFAULT_HISTORY_LIMIT, STALE_SENSOR_MS } from './types/runtime-state.types';

export interface QbxRuntimeConfig {
  clock: Clock;
  random: RandomSource;
  gateway?: DeviceGateway;
}

function createInitialOutputState(
  output: Device['outputs'][number],
  device: Device,
): OutputRuntimeState {
  return {
    outputId: output.id,
    deviceId: device.id,
    spaceId: device.spaceId,
    state: false,
    desiredState: false,
    reportedState: false,
    commandStatus: 'idle',
    controlMode: output.isAuto ? 'auto' : 'manual',
    safeState: 'off',
    maxContinuousOnSeconds: output.maxContinuousOnSeconds,
    onSinceMs: null,
    controllingAutomationId: output.activeAutomationId,
    controllingAutomationName: output.activeAutomationName,
  };
}

export interface QbxRuntimeView {
  devices: Device[];
  automations: Automation[];
  spaces: Space[];
  snapshot: RuntimeSnapshot;
  sensorHistory: (sensorId: string) => import('../domain/sensor/sensor.types').SensorHistoryPoint[];
}

export class QbxRuntime {
  private readonly clock: Clock;
  private readonly random: RandomSource;
  private readonly gateway: DeviceGateway;
  private readonly engine = new AutomationEngine();
  private readonly events = new EventLog();
  private readonly history = new HistoryBuffer(DEFAULT_HISTORY_LIMIT);

  private spaces: Space[] = [];
  private devices: Device[] = [];
  private automations: Automation[] = [];
  private outputStates: Record<string, OutputRuntimeState> = {};
  private automationStates: Record<string, AutomationRuntimeState> = {};
  private timerStates: Record<string, TimerRuntimeState> = {};
  private spaceStates: Record<string, SpaceRuntimeState> = {};
  private simulationEnabled = false;
  private lastSensorEventMs: Record<string, number> = {};
  private lastAutomationError: Record<string, string | undefined> = {};
  private lastDeviceConnection: Record<string, ConnectionState> = {};

  constructor(config: QbxRuntimeConfig) {
    this.clock = config.clock;
    this.random = config.random;
    this.gateway = config.gateway ?? createGateway({ clock: this.clock, random: this.random });
    this.simulationEnabled = this.gateway.mode === 'simulator';
  }

  boot(spaces: Space[], devices: Device[], automations: Automation[]): void {
    this.spaces = spaces;
    this.devices = devices;
    this.automations = automations.map((automation) => ({
      ...automation,
      priority: automation.priority ?? 0,
    }));

    this.spaceStates = Object.fromEntries(
      spaces.map((space) => [space.id, { spaceId: space.id, emergencyActive: false }]),
    );

    this.outputStates = {};
    for (const device of devices) {
      for (const output of device.outputs) {
        this.outputStates[output.id] = createInitialOutputState(output, device);
      }
      if (this.simulationEnabled) {
        for (const sensor of device.inputs) {
          if (sensor.type !== 'unused' && sensor.history?.length) {
            this.history.seed(sensor.id, sensor.history);
          }
        }
      }
    }

    this.gateway.loadDevices?.(devices, Object.values(this.outputStates));
    this.resetAutomationRuntimeStates();
    this.syncDeviceConnectionEvents();
  }

  tick(): void {
    if (this.simulationEnabled) {
      void this.gateway.tickSimulation(1000);
    }

    const readings = Object.fromEntries(
      this.gateway.getAllSensorReadings().map((reading) => [reading.sensorId, reading]),
    );
    const staleChecked = markStaleSensors(readings, this.clock.nowMs(), STALE_SENSOR_MS);

    for (const reading of Object.values(staleChecked)) {
      this.history.push(reading.sensorId, reading.timestampMs, reading.value);
      this.recordSensorReadingEvent(reading);
    }

    this.syncDeviceConnectionEvents();
    this.applySafetyTimeouts();

    const engineResult = this.engine.evaluate({
      clock: this.clock,
      devices: this.devices,
      automations: this.automations,
      sensorReadings: staleChecked,
      outputStates: this.outputStates,
      spaceStates: this.spaceStates,
      timerStates: this.timerStates,
      simulationEnabled: this.simulationEnabled,
    });

    this.automationStates = engineResult.automationStates;
    this.timerStates = engineResult.timerStates;
    this.recordAutomationErrors();

    for (const command of engineResult.outputCommands) {
      this.applyOutputCommand(command);
    }

    this.syncAutomationsFromStates();
    this.gateway.setOutputRuntimeStates?.(Object.values(this.outputStates));
    this.devices = this.mergeDevicesForView(staleChecked);
  }

  setSimulationEnabled(enabled: boolean): void {
    this.simulationEnabled = enabled && this.gateway.mode === 'simulator';
  }

  getView(): QbxRuntimeView {
    const readings = Object.fromEntries(
      this.gateway.getAllSensorReadings().map((reading) => [reading.sensorId, reading]),
    );
    return {
      spaces: this.spaces,
      devices: this.mergeDevicesForView(readings),
      automations: this.automations,
      snapshot: this.getSnapshot(),
      sensorHistory: (sensorId) => this.history.get(sensorId),
    };
  }

  getSnapshot(): RuntimeSnapshot {
    const readings = Object.fromEntries(
      this.gateway.getAllSensorReadings().map((reading) => [reading.sensorId, reading]),
    );
    return {
      sensorReadings: readings,
      outputStates: { ...this.outputStates },
      automationStates: { ...this.automationStates },
      timerStates: { ...this.timerStates },
      spaceStates: { ...this.spaceStates },
    };
  }

  getEvents(): ReturnType<EventLog['list']> {
    return this.events.list();
  }

  setOutputManual(deviceId: string, outputId: string, state: boolean): void {
    const output = this.outputStates[outputId];
    if (!output) return;

    if (this.gateway.mode === 'hardware') {
      void this.applyHardwareOutputCommand(deviceId, outputId, state, output, 'manual');
      return;
    }

    this.outputStates[outputId] = {
      ...output,
      state,
      desiredState: state,
      reportedState: state,
      commandStatus: 'acknowledged',
      controlMode: 'manual',
      onSinceMs: state ? this.clock.nowMs() : null,
      controllingAutomationId: undefined,
      controllingAutomationName: undefined,
    };
    this.events.record('MANUAL_OVERRIDE', this.clock.nowMs(), `Manual ${state ? 'ON' : 'OFF'}`, {
      deviceId,
      outputId,
      spaceId: output.spaceId,
    });
    this.gateway.setOutputRuntimeStates?.(Object.values(this.outputStates));
    this.devices = this.mergeDevicesForView();
  }

  returnOutputToAuto(deviceId: string, outputId: string): void {
    const output = this.outputStates[outputId];
    if (!output) return;
    this.outputStates[outputId] = {
      ...output,
      controlMode: 'auto',
    };
    this.events.record('AUTO_RESTORED', this.clock.nowMs(), 'Output returned to auto', {
      deviceId,
      outputId,
      spaceId: output.spaceId,
    });
  }

  emergencyOff(spaceId: string): void {
    this.spaceStates[spaceId] = { spaceId, emergencyActive: true };
    for (const output of Object.values(this.outputStates)) {
      if (output.spaceId !== spaceId) continue;
      this.outputStates[output.outputId] = {
        ...output,
        state: false,
        desiredState: false,
        reportedState: false,
        controlMode: 'manual',
        onSinceMs: null,
        controllingAutomationId: undefined,
        controllingAutomationName: undefined,
      };
    }
    this.events.record('EMERGENCY_OFF', this.clock.nowMs(), 'Emergency off activated', { spaceId });
    this.gateway.setOutputRuntimeStates?.(Object.values(this.outputStates));
    this.devices = this.mergeDevicesForView();
  }

  releaseEmergency(spaceId: string): void {
    this.spaceStates[spaceId] = { spaceId, emergencyActive: false };
    this.events.record('EMERGENCY_RELEASED', this.clock.nowMs(), 'Emergency released', { spaceId });
  }

  isEmergencyActive(spaceId: string): boolean {
    return this.spaceStates[spaceId]?.emergencyActive ?? false;
  }

  setDeviceConnectionState(deviceId: string, state: ConnectionState): void {
    this.gateway.setDeviceConnectionState?.(deviceId, state);
    this.devices = this.devices.map((device) =>
      device.id === deviceId ? { ...device, isOnline: state === 'online' } : device,
    );
    this.syncDeviceConnectionEvents();
  }

  setSensorValue(sensorId: string, value: number): void {
    this.gateway.setSensorValue?.(sensorId, value);
  }

  updateConfiguration(spaces: Space[], devices: Device[], automations: Automation[]): void {
    this.spaces = spaces;
    this.devices = devices;
    this.automations = automations;

    for (const device of devices) {
      for (const output of device.outputs) {
        if (!this.outputStates[output.id]) {
          this.outputStates[output.id] = createInitialOutputState(output, device);
        } else {
          this.outputStates[output.id] = {
            ...this.outputStates[output.id],
            controlMode: output.isAuto ? 'auto' : 'manual',
            maxContinuousOnSeconds: output.maxContinuousOnSeconds,
          };
        }
      }
    }

    this.gateway.loadDevices?.(devices, Object.values(this.outputStates));
  }

  private applyOutputCommand(command: OutputCommand): void {
    if (this.gateway.mode === 'hardware') {
      const current = this.outputStates[command.outputId];
      if (!current || current.controlMode === 'manual') return;
      if (this.spaceStates[command.spaceId]?.emergencyActive && command.desiredState) return;
      void this.applyHardwareOutputCommand(
        command.deviceId,
        command.outputId,
        command.desiredState,
        current,
        'auto',
        command,
      );
      return;
    }

    this.applySimulatorOutputCommand(command);
  }

  private applySimulatorOutputCommand(command: OutputCommand): void {
    const current = this.outputStates[command.outputId];
    if (!current || current.controlMode === 'manual') return;
    if (this.spaceStates[command.spaceId]?.emergencyActive && command.desiredState) return;

    const device = this.devices.find((entry) => entry.id === command.deviceId);
    if (!device?.isOnline) {
      this.events.record('DEVICE_OFFLINE', this.clock.nowMs(), 'Command skipped: device offline', {
        deviceId: command.deviceId,
        outputId: command.outputId,
        spaceId: command.spaceId,
        automationId: command.automationId,
      });
      return;
    }

    if (current.state === command.desiredState) {
      this.outputStates[command.outputId] = {
        ...current,
        controllingAutomationId: command.desiredState ? command.automationId : undefined,
        controllingAutomationName: command.desiredState ? command.automationName : undefined,
      };
      return;
    }

    this.outputStates[command.outputId] = {
      ...current,
      state: command.desiredState,
      desiredState: command.desiredState,
      reportedState: command.desiredState,
      commandStatus: 'acknowledged',
      onSinceMs: command.desiredState ? this.clock.nowMs() : null,
      controllingAutomationId: command.desiredState ? command.automationId : undefined,
      controllingAutomationName: command.desiredState ? command.automationName : undefined,
    };

    this.events.record(
      command.desiredState ? 'OUTPUT_ON' : 'OUTPUT_OFF',
      this.clock.nowMs(),
      `${command.automationName} ${command.desiredState ? 'ON' : 'OFF'}`,
      {
        automationId: command.automationId,
        outputId: command.outputId,
        deviceId: command.deviceId,
        spaceId: command.spaceId,
      },
    );
    this.events.record(
      command.desiredState ? 'AUTOMATION_TRIGGERED' : 'AUTOMATION_STOPPED',
      this.clock.nowMs(),
      command.automationName,
      {
        automationId: command.automationId,
        outputId: command.outputId,
        deviceId: command.deviceId,
        spaceId: command.spaceId,
      },
    );
  }

  private async applyHardwareOutputCommand(
    deviceId: string,
    outputId: string,
    desiredState: boolean,
    current: OutputRuntimeState,
    mode: 'manual' | 'auto',
    command?: OutputCommand,
  ): Promise<void> {
    const connection = await this.gateway.getConnectionState(deviceId);
    if (connection !== 'online') {
      this.outputStates[outputId] = {
        ...current,
        desiredState,
        commandStatus: 'failed',
      };
      this.events.record('DEVICE_OFFLINE', this.clock.nowMs(), 'Command skipped: device offline', {
        deviceId,
        outputId,
        spaceId: current.spaceId,
        automationId: command?.automationId,
      });
      this.devices = this.mergeDevicesForView();
      return;
    }

    this.outputStates[outputId] = {
      ...current,
      desiredState,
      commandStatus: 'pending',
      controlMode: mode === 'manual' ? 'manual' : current.controlMode,
      onSinceMs: null,
      controllingAutomationId: undefined,
      controllingAutomationName: undefined,
    };

    const result = await this.gateway.setOutputState(deviceId, outputId, desiredState);
    if (result.status === 'acknowledged') {
      this.outputStates[outputId] = {
        ...this.outputStates[outputId],
        state: desiredState,
        reportedState: desiredState,
        commandStatus: 'acknowledged',
        onSinceMs: desiredState ? this.clock.nowMs() : null,
        controllingAutomationId: command?.desiredState ? command.automationId : undefined,
        controllingAutomationName: command?.desiredState ? command.automationName : undefined,
      };
      if (command) {
        this.events.record(
          command.desiredState ? 'OUTPUT_ON' : 'OUTPUT_OFF',
          this.clock.nowMs(),
          `${command.automationName} ${command.desiredState ? 'ON' : 'OFF'}`,
          {
            automationId: command.automationId,
            outputId: command.outputId,
            deviceId: command.deviceId,
            spaceId: command.spaceId,
          },
        );
      }
    } else {
      this.outputStates[outputId] = {
        ...this.outputStates[outputId],
        commandStatus: result.status,
      };
      this.events.record('COMMAND_FAILED', this.clock.nowMs(), result.error ?? 'Command failed', {
        deviceId,
        outputId,
        spaceId: current.spaceId,
      });
    }

    this.gateway.setOutputRuntimeStates?.(Object.values(this.outputStates));
    this.devices = this.mergeDevicesForView();
  }

  private applySafetyTimeouts(): void {
    const now = this.clock.nowMs();
    for (const output of Object.values(this.outputStates)) {
      if (!output.state || output.onSinceMs === null || !output.maxContinuousOnSeconds) continue;
      if (now - output.onSinceMs < output.maxContinuousOnSeconds * 1000) continue;
      this.outputStates[output.outputId] = {
        ...output,
        state: false,
        desiredState: false,
        reportedState: false,
        onSinceMs: null,
        controlMode: 'manual',
        controllingAutomationId: undefined,
        controllingAutomationName: undefined,
      };
      this.events.record('OUTPUT_SAFETY_TIMEOUT', now, 'Output safety timeout', {
        outputId: output.outputId,
        deviceId: output.deviceId,
        spaceId: output.spaceId,
      });
    }
  }

  private syncAutomationsFromStates(): void {
    this.automations = this.automations.map((automation) => ({
      ...automation,
      runtimeStatus: this.automationStates[automation.id]?.runtimeStatus ?? (automation.isEnabled ? 'waiting' : 'disabled'),
      enabled: automation.isEnabled,
    }));
  }

  private resetAutomationRuntimeStates(): void {
    this.automationStates = Object.fromEntries(
      this.automations.map((automation) => [
        automation.id,
        {
          automationId: automation.id,
          runtimeStatus: automation.isEnabled ? 'waiting' : 'disabled',
        },
      ]),
    );
    this.timerStates = {};
  }

  private mergeDevicesForView(readings: Record<string, SensorReading> = {}): Device[] {
    const readingMap =
      Object.keys(readings).length > 0
        ? readings
        : Object.fromEntries(this.gateway.getAllSensorReadings().map((reading) => [reading.sensorId, reading]));

    return this.devices.map((device) => ({
      ...device,
      inputs: device.inputs.map((sensor) => {
        const reading = readingMap[sensor.id];
        if (!reading) {
          return {
            ...sensor,
            currentValue: Number.NaN,
            value: undefined,
            history: this.history.get(sensor.id),
          };
        }
        return {
          ...sensor,
          currentValue: reading.value,
          value: reading.value,
          status: evaluateSensorStatus(reading),
          history: this.history.get(sensor.id),
        };
      }),
      sensors: device.inputs.map((sensor) => {
        const reading = readingMap[sensor.id];
        if (!reading) {
          return {
            ...sensor,
            currentValue: Number.NaN,
            value: undefined,
            history: this.history.get(sensor.id),
          };
        }
        return {
          ...sensor,
          currentValue: reading.value,
          value: reading.value,
          status: evaluateSensorStatus(reading),
          history: this.history.get(sensor.id),
        };
      }),
      outputs: device.outputs.map((output) => {
        const runtime = this.outputStates[output.id];
        if (!runtime) return output;
        return {
          ...output,
          state: runtime.reportedState,
          isAuto: runtime.controlMode === 'auto',
          controlMode: runtime.controlMode,
          activeAutomationId: runtime.controllingAutomationId,
          activeAutomationName: runtime.controllingAutomationName,
        };
      }),
    }));
  }

  private recordSensorReadingEvent(reading: SensorReading): void {
    const lastMs = this.lastSensorEventMs[reading.sensorId] ?? 0;
    const now = this.clock.nowMs();
    if (now - lastMs < 60_000) return;
    this.lastSensorEventMs[reading.sensorId] = now;
    this.events.record('SENSOR_READING', now, `${reading.type} ${reading.value}${reading.unit}`, {
      sensorId: reading.sensorId,
      deviceId: reading.deviceId,
      spaceId: reading.spaceId,
      payload: { value: reading.value, quality: reading.quality },
    });
  }

  private recordAutomationErrors(): void {
    for (const [automationId, state] of Object.entries(this.automationStates)) {
      if (state.runtimeStatus !== 'error') {
        this.lastAutomationError[automationId] = undefined;
        continue;
      }
      if (this.lastAutomationError[automationId] === state.lastError) continue;
      this.lastAutomationError[automationId] = state.lastError;
      const automation = this.automations.find((entry) => entry.id === automationId);
      this.events.record('AUTOMATION_ERROR', this.clock.nowMs(), state.lastError ?? 'Automation error', {
        automationId,
        spaceId: automation?.spaceId,
      });
    }
  }

  private syncDeviceConnectionEvents(): void {
    for (const device of this.devices) {
      const state: ConnectionState = device.isOnline ? 'online' : 'offline';
      const previous = this.lastDeviceConnection[device.id];
      if (previous === state) continue;
      this.lastDeviceConnection[device.id] = state;
      this.events.record(
        state === 'online' ? 'DEVICE_ONLINE' : 'DEVICE_OFFLINE',
        this.clock.nowMs(),
        `Device ${state}`,
        { deviceId: device.id, spaceId: device.spaceId },
      );
    }
  }
}
