import type { Device } from '../device/device.types';
import type { EquipmentType } from '../equipment/equipment.types';
import type { MapPlacement, SpaceMap } from './space-map.types';

export type BindTargetKind = 'device' | 'sensor' | 'output';

export interface BindCandidate {
  key: string;
  kind: BindTargetKind;
  deviceId: string;
  deviceName: string;
  endpointLabel: string;
  roleLabel: string;
  online: boolean;
  sensorId?: string;
  outputId?: string;
  outputType?: EquipmentType;
}

function deviceTitle(device: Device): string {
  return device.customName || device.name;
}

function alreadyBound(map: SpaceMap, candidate: BindCandidate, current?: MapPlacement): boolean {
  return map.placements.some((p) => {
    if (current && p.id === current.id) return false;
    if (candidate.sensorId && p.sensorId === candidate.sensorId) return true;
    if (candidate.outputId && p.outputId === candidate.outputId) return true;
    if (candidate.kind === 'device' && p.kind === 'hub' && p.deviceId === candidate.deviceId) return true;
    return false;
  });
}

export function placementBindRole(placement: MapPlacement): 'sensor' | 'light' | 'ventilation' | 'irrigation' | 'hub' | 'none' {
  const role = (placement.role ?? placement.catalogId ?? '').toLowerCase();
  if (placement.kind === 'sensor') return 'sensor';
  if (placement.kind === 'hub') return 'hub';
  if (placement.kind === 'light') return 'light';
  if (placement.kind === 'irrigation' || role === 'pump' || role === 'valve' || role === 'reservoir') return 'irrigation';
  if (placement.kind === 'equipment') {
    if (role === 'humidifier' || role === 'heater' || role === 'hvac' || role === 'dehumidifier') return 'ventilation';
    return 'ventilation';
  }
  if (role.includes('exhaust') || role.includes('fan') || role === 'circulation' || role === 'intake') return 'ventilation';
  return 'none';
}

function outputMatches(placement: MapPlacement, type: EquipmentType): boolean {
  const role = placementBindRole(placement);
  if (role === 'light') return type === 'lighting';
  if (role === 'irrigation') return type === 'watering' || type === 'valve';
  if (role === 'ventilation') {
    const r = (placement.role ?? '').toLowerCase();
    if (r === 'humidifier') return type === 'humidifier';
    if (r === 'heater') return type === 'heating';
    if (r === 'hvac') return type === 'ventilation' || type === 'heating';
    return type === 'ventilation';
  }
  return false;
}

export function listCompatibleBindTargets(
  placement: MapPlacement,
  devices: Device[],
  map: SpaceMap,
): BindCandidate[] {
  const role = placementBindRole(placement);
  if (role === 'none') return [];
  const out: BindCandidate[] = [];
  for (const device of devices) {
    const deviceName = deviceTitle(device);
    if (role === 'hub') {
      const candidate: BindCandidate = {
        key: `hub:${device.id}`,
        kind: 'device',
        deviceId: device.id,
        deviceName,
        endpointLabel: device.modelName || 'QBX',
        roleLabel: deviceName,
        online: device.isOnline,
      };
      if (!alreadyBound(map, candidate, placement)) out.push(candidate);
      continue;
    }
    if (role === 'sensor') {
      for (const s of device.inputs) {
        if (s.type === 'unused') continue;
        const candidate: BindCandidate = {
          key: `sensor:${s.id}`,
          kind: 'sensor',
          deviceId: device.id,
          deviceName,
          endpointLabel: s.hardwareLabel || `IN${s.portNumber}`,
          roleLabel: s.customName || s.name,
          online: device.isOnline,
          sensorId: s.id,
        };
        if (!alreadyBound(map, candidate, placement)) out.push(candidate);
      }
      continue;
    }
    for (const o of device.outputs) {
      if (o.type === 'unused') continue;
      if (!outputMatches(placement, o.type)) continue;
      const candidate: BindCandidate = {
        key: `output:${o.id}`,
        kind: 'output',
        deviceId: device.id,
        deviceName,
        endpointLabel: o.hardwareLabel || `OUT${o.portNumber}`,
        roleLabel: o.customName || o.name,
        online: device.isOnline,
        outputId: o.id,
        outputType: o.type,
      };
      if (!alreadyBound(map, candidate, placement)) out.push(candidate);
    }
  }
  return out;
}

export function bindPlacement(placement: MapPlacement, target: BindCandidate): MapPlacement {
  const next: MapPlacement = {
    ...placement,
    deviceId: target.deviceId,
    label: placement.label || target.roleLabel,
  };
  if (target.kind === 'sensor') {
    next.sensorId = target.sensorId;
    delete next.outputId;
  } else if (target.kind === 'output') {
    next.outputId = target.outputId;
    delete next.sensorId;
  } else {
    delete next.sensorId;
    delete next.outputId;
  }
  return next;
}

/** Removes only the Device/port bind. Spatial object stays. */
export function unbindPlacement(placement: MapPlacement): MapPlacement {
  const { deviceId: _d, sensorId: _s, outputId: _o, ...rest } = placement;
  return rest;
}

/** Spatial object remains; only the Device bind is cleared. */
export function unbindDeviceFromPlacement(placement: MapPlacement, deviceId: string): MapPlacement {
  if (placement.deviceId !== deviceId) return placement;
  return unbindPlacement(placement);
}

/** Deleting a Device must not delete its spatial representation. */
export function unbindDeviceFromMap(map: SpaceMap, deviceId: string): SpaceMap {
  return {
    ...map,
    placements: map.placements.map((p) => unbindDeviceFromPlacement(p, deviceId)),
    updatedAt: new Date().toISOString(),
  };
}
