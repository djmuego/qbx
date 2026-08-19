import type { MapBlueprint } from '../../domain/map/map-blueprint.types';
import type { Device } from '../../domain/device/device.types';

export interface DeviceMatchCandidate {
  deviceId: string;
  deviceName: string;
  sensorId?: string;
  outputId?: string;
  label: string;
  score: number;
}

export interface BlueprintDeviceMatch {
  objectId: string;
  objectName: string;
  role?: string;
  candidates: DeviceMatchCandidate[];
  linked: boolean;
}

export function matchBlueprintToDevices(blueprint: MapBlueprint, devices: Device[]): BlueprintDeviceMatch[] {
  const matches: BlueprintDeviceMatch[] = [];

  for (const obj of blueprint.objects) {
    const candidates: DeviceMatchCandidate[] = [];
    for (const device of devices) {
      if (obj.type === 'sensor' || obj.role === 'climate') {
        for (const sensor of device.inputs) {
          if (sensor.type === 'unused') continue;
          const climate = obj.role === 'climate' && (sensor.type === 'temperature' || sensor.type === 'humidity');
          const soil = obj.role === 'soil' && sensor.type === 'soil_moisture';
          if (climate || soil || obj.type === 'sensor') {
            candidates.push({
              deviceId: device.id,
              deviceName: device.customName,
              sensorId: sensor.id,
              label: sensor.customName || sensor.name,
              score: climate || soil ? 2 : 1,
            });
          }
        }
      }
      if (obj.type === 'light') {
        for (const output of device.outputs) {
          if (output.type === 'lighting') {
            candidates.push({
              deviceId: device.id,
              deviceName: device.customName,
              outputId: output.id,
              label: output.customName || output.name,
              score: 2,
            });
          }
        }
      }
      if (obj.type === 'equipment' || obj.role === 'exhaust') {
        for (const output of device.outputs) {
          if (output.type === 'unused') continue;
          const exhaust = obj.role === 'exhaust' && output.type === 'ventilation';
          const nameHit = obj.role === 'exhaust' && /вытяж|exhaust/i.test(output.customName || output.name);
          if (exhaust || nameHit) {
            candidates.push({
              deviceId: device.id,
              deviceName: device.customName,
              outputId: output.id,
              label: output.customName || output.name,
              score: nameHit ? 3 : 2,
            });
          }
        }
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    matches.push({
      objectId: obj.id,
      objectName: obj.name,
      role: obj.role,
      candidates: candidates.slice(0, 3),
      linked: false,
    });
  }

  return matches;
}
