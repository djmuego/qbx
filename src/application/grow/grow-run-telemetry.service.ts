import type { Device } from '../../domain/device/device.types';
import type { RuntimeTelemetrySlice } from './grow-run-telemetry.store';
import { calculateVpdKpa } from '../../domain/agronomy/vpd';

function readSensorValue(
  devices: Device[],
  spaceId: string,
  type: 'temperature' | 'humidity' | 'soil_moisture',
): number | null {
  for (const device of devices) {
    if (device.spaceId !== spaceId || !device.isOnline) continue;
    for (const input of device.inputs) {
      if (input.type !== type) continue;
      const value = input.currentValue ?? input.value;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
    }
  }
  return null;
}

function readLightOn(devices: Device[], spaceId: string): boolean | null {
  for (const device of devices) {
    if (device.spaceId !== spaceId || !device.isOnline) continue;
    for (const output of device.outputs) {
      if (output.type !== 'lighting') continue;
      return output.state;
    }
  }
  return null;
}

export function buildRuntimeTelemetrySlice(devices: Device[], spaceId: string): RuntimeTelemetrySlice {
  const tempC = readSensorValue(devices, spaceId, 'temperature');
  const humidityPct = readSensorValue(devices, spaceId, 'humidity');
  const soilMoisturePct = readSensorValue(devices, spaceId, 'soil_moisture');
  const vpdKpa =
    tempC != null && humidityPct != null ? Number(calculateVpdKpa(tempC, humidityPct).toFixed(2)) : null;

  return {
    tempC,
    humidityPct,
    vpdKpa,
    soilMoisturePct,
    lightOn: readLightOn(devices, spaceId),
  };
}

export function hasTelemetryData(slice: RuntimeTelemetrySlice): boolean {
  return (
    slice.tempC != null ||
    slice.humidityPct != null ||
    slice.soilMoisturePct != null ||
    slice.lightOn != null
  );
}
