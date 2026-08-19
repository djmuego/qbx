import type { CommandResult } from '../../domain/device/command.types';
import { HardwareGateway } from './hardware.gateway';
import type { RealControllerAdapter } from './device-gateway.contract';

export class RealControllerAdapterStub extends HardwareGateway implements RealControllerAdapter {
  constructor(clock: import('../clock').Clock) {
    super(clock);
  }
  async connect(): Promise<void> {
    throw new Error('Transport not implemented — Pass 3');
  }

  async disconnect(): Promise<void> {}

  async getSnapshot(_deviceId: string): Promise<unknown> {
    return null;
  }

  async sendCommand(_command: unknown): Promise<CommandResult> {
    return {
      commandId: `cmd-stub-${Date.now()}`,
      status: 'failed',
      timestampMs: Date.now(),
      error: 'Transport not implemented — Pass 3',
    };
  }
}
