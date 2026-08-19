import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';

export function stripDeviceLiveState(device: Device): Device {
  return {
    ...device,
    isOnline: false,
    inputs: device.inputs.map((sensor) => ({
      ...sensor,
      currentValue: sensor.type === 'unused' ? 0 : 0,
      value: undefined,
      history: [],
      status: 'normal',
    })),
    sensors: device.sensors?.map((sensor) => ({
      ...sensor,
      currentValue: sensor.type === 'unused' ? 0 : 0,
      value: undefined,
      history: [],
      status: 'normal',
    })),
    outputs: device.outputs.map((output) => ({
      ...output,
      state: false,
      activeAutomationId: undefined,
      activeAutomationName: undefined,
    })),
  };
}

export function stripAutomationLiveState(automation: Automation): Automation {
  return {
    ...automation,
    runtimeStatus: undefined,
  };
}
