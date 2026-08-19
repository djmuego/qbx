import type { Clock } from '../clock';
import type { CommandResult } from '../../domain/device/command.types';

export interface TrackedCommand {
  commandId: string;
  outputId: string;
  deviceId: string;
  desiredState: boolean;
  status: CommandResult['status'];
  createdAtMs: number;
  updatedAtMs: number;
  error?: string;
}

export class CommandTracker {
  private commands = new Map<string, TrackedCommand>();

  constructor(
    private readonly clock: Clock,
    private readonly timeoutMs = 10_000,
  ) {}

  create(outputId: string, deviceId: string, desiredState: boolean): TrackedCommand {
    const command: TrackedCommand = {
      commandId: `cmd-${outputId}-${this.clock.nowMs()}`,
      outputId,
      deviceId,
      desiredState,
      status: 'pending',
      createdAtMs: this.clock.nowMs(),
      updatedAtMs: this.clock.nowMs(),
    };
    this.commands.set(command.commandId, command);
    return command;
  }

  acknowledge(commandId: string): TrackedCommand | null {
    const command = this.commands.get(commandId);
    if (!command) return null;
    command.status = 'acknowledged';
    command.updatedAtMs = this.clock.nowMs();
    return command;
  }

  fail(commandId: string, error: string): TrackedCommand | null {
    const command = this.commands.get(commandId);
    if (!command) return null;
    command.status = 'failed';
    command.error = error;
    command.updatedAtMs = this.clock.nowMs();
    return command;
  }

  expireTimedOut(): TrackedCommand[] {
    const now = this.clock.nowMs();
    const expired: TrackedCommand[] = [];
    for (const command of this.commands.values()) {
      if (command.status !== 'pending') continue;
      if (now - command.createdAtMs < this.timeoutMs) continue;
      command.status = 'timeout';
      command.error = 'Command timeout';
      command.updatedAtMs = now;
      expired.push(command);
    }
    return expired;
  }

  getPendingForOutput(outputId: string): TrackedCommand | undefined {
    for (const command of this.commands.values()) {
      if (command.outputId === outputId && command.status === 'pending') {
        return command;
      }
    }
    return undefined;
  }
}
