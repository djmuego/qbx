export type CommandStatus = 'pending' | 'acknowledged' | 'failed' | 'timeout';

export type DeviceCommandType = 'setOutput' | 'getSnapshot' | 'getCapabilities' | 'getDeviceInfo';

export interface CommandResult {
  commandId: string;
  status: CommandStatus;
  timestampMs: number;
  error?: string;
}

export interface SetOutputCommand {
  type: 'setOutput';
  deviceId: string;
  outputId: string;
  state: boolean;
}

export interface GetSnapshotCommand {
  type: 'getSnapshot';
  deviceId: string;
}

export type DeviceCommand = SetOutputCommand | GetSnapshotCommand;
