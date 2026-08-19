import type { Device } from '../device/device.types';
import type { EquipmentType } from '../equipment/equipment.types';
import type { MapObjectKind, MapPlacement, SpaceMap } from './space-map.types';

export interface UnboundMapPort {
  key: string;
  kind: MapObjectKind;
  label: string;
  deviceId: string;
  deviceName: string;
  sensorId?: string;
  outputId?: string;
}

export function kindForOutputType(type: EquipmentType): MapObjectKind {
  if (type === 'lighting') return 'light';
  if (type === 'watering' || type === 'valve') return 'irrigation';
  return 'equipment';
}

export function listUnboundPorts(devices: Device[], map: SpaceMap | null): UnboundMapPort[] {
  const placements = map?.placements ?? [];
  const boundSensors = new Set(placements.map((p) => p.sensorId).filter(Boolean));
  const boundOutputs = new Set(placements.map((p) => p.outputId).filter(Boolean));
  const boundHubs = new Set(
    placements.filter((p) => p.kind === 'hub' && p.deviceId).map((p) => p.deviceId as string),
  );

  const ports: UnboundMapPort[] = [];
  for (const device of devices) {
    if (!boundHubs.has(device.id)) {
      ports.push({
        key: `hub:${device.id}`,
        kind: 'hub',
        label: device.customName || device.name,
        deviceId: device.id,
        deviceName: device.customName || device.name,
      });
    }
    for (const sensor of device.inputs) {
      if (sensor.type === 'unused' || boundSensors.has(sensor.id)) continue;
      ports.push({
        key: `sensor:${sensor.id}`,
        kind: 'sensor',
        label: sensor.customName || sensor.name,
        deviceId: device.id,
        deviceName: device.customName || device.name,
        sensorId: sensor.id,
      });
    }
    for (const output of device.outputs) {
      if (output.type === 'unused' || boundOutputs.has(output.id)) continue;
      ports.push({
        key: `output:${output.id}`,
        kind: kindForOutputType(output.type),
        label: output.customName || output.name,
        deviceId: device.id,
        deviceName: device.customName || device.name,
        outputId: output.id,
      });
    }
  }
  return ports;
}

export function placementBindKey(placement: MapPlacement): string | null {
  if (placement.sensorId) return `sensor:${placement.sensorId}`;
  if (placement.outputId) return `output:${placement.outputId}`;
  if (placement.kind === 'hub' && placement.deviceId) return `hub:${placement.deviceId}`;
  return null;
}
