import type { CommandResult } from '../../domain/device/command.types';
import type { ConnectionState } from '../../domain/device/device-lifecycle.types';
import type { SensorReading } from '../types/runtime-state.types';

export type DeviceConnectionState = ConnectionState;

export interface DeviceRuntimeState {
  deviceId: string;
  spaceId: string;
  connectionState: ConnectionState;
  sensorReadings: SensorReading[];
  outputStates: Record<string, boolean>;
}

export interface DeviceGateway {
  readonly mode: 'hardware' | 'simulator';
  initialize(): Promise<void>;
  loadDevices?(
    devices: import('../../domain/device/device.types').Device[],
    outputs: import('../types/runtime-state.types').OutputRuntimeState[],
  ): void;
  setOutputRuntimeStates?(outputs: import('../types/runtime-state.types').OutputRuntimeState[]): void;
  getAllSensorReadings(): SensorReading[];
  getDeviceState(deviceId: string): Promise<DeviceRuntimeState | null>;
  setOutputState(deviceId: string, outputId: string, state: boolean): Promise<CommandResult>;
  getSensorValues(deviceId: string): Promise<SensorReading[]>;
  getConnectionState(deviceId: string): Promise<ConnectionState>;
  tickSimulation(deltaMs: number): Promise<void>;
  setDeviceConnectionState?(deviceId: string, state: ConnectionState): void;
  setSensorValue?(sensorId: string, value: number): void;
}

export interface RealControllerAdapter extends DeviceGateway {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getSnapshot(deviceId: string): Promise<unknown>;
  sendCommand(command: unknown): Promise<CommandResult>;
}
