import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { Sensor } from '../../domain/sensor/sensor.types';
import type { RuntimeMode } from '../../config/runtime-mode';

export const EXPORT_SCHEMA_VERSION = 1 as const;

function stripSensor(sensor: Sensor): Sensor {
  return {
    ...sensor,
    currentValue: 0,
    value: 0,
    status: 'normal',
    history: [],
  };
}

/** Configuration only — never persist live telemetry / connection as export SoT. */
export function stripEphemeralDevice(device: Device): Device {
  const inputs = device.inputs.map(stripSensor);
  return {
    ...device,
    isOnline: false,
    status: 'offline',
    inputs,
    sensors: (device.sensors ?? inputs).map(stripSensor),
    outputs: device.outputs.map((output) => ({
      ...output,
      state: false,
      activeAutomationId: undefined,
      activeAutomationName: undefined,
    })),
  };
}

export function stripEphemeralAutomation(automation: Automation): Automation {
  return {
    ...automation,
    runtimeStatus: 'waiting',
  };
}

/**
 * Import always drops live readings.
 * Simulator then marks devices online (virtual bus); hardware stays offline.
 */
export function sanitizeImportedDevices(devices: Device[], mode: RuntimeMode): Device[] {
  const stripped = devices.map(stripEphemeralDevice);
  if (mode === 'simulator') {
    return stripped.map((device) => ({ ...device, isOnline: true, status: 'online' as const }));
  }
  return stripped;
}
