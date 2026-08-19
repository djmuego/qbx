import type { Clock } from '../clock';
import type { Device } from '../../domain/device/device.types';
import type { CommandResult } from '../../domain/device/command.types';
import type { ConnectionState } from '../../domain/device/device-lifecycle.types';
import type { OutputRuntimeState, SensorReading } from '../types/runtime-state.types';
import type { DeviceGateway, DeviceRuntimeState } from './device-gateway.contract';

export class HardwareGateway implements DeviceGateway {
  readonly mode = 'hardware' as const;

  constructor(private readonly clock: Clock) {}

  async initialize(): Promise<void> {}

  loadDevices(_devices: Device[], _outputs: OutputRuntimeState[]): void {}

  setOutputRuntimeStates(_outputs: OutputRuntimeState[]): void {}

  getAllSensorReadings(): SensorReading[] {
    return [];
  }

  async getDeviceState(_deviceId: string): Promise<DeviceRuntimeState | null> {
    return null;
  }

  async setOutputState(_deviceId: string, _outputId: string, _state: boolean): Promise<CommandResult> {
    return {
      commandId: `cmd-${this.clock.nowMs()}`,
      status: 'failed',
      timestampMs: this.clock.nowMs(),
      error: 'No hardware transport connected',
    };
  }

  async getSensorValues(_deviceId: string): Promise<SensorReading[]> {
    return [];
  }

  async getConnectionState(_deviceId: string): Promise<ConnectionState> {
    return 'offline';
  }

  async tickSimulation(_deltaMs: number): Promise<void> {}
}
