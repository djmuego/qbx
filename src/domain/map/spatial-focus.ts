import type { MapPlacement, SpaceMap } from './space-map.types';

export interface SpatialFocusTarget {
  spaceId: string;
  placementId?: string;
  deviceId?: string;
  sensorId?: string;
  outputId?: string;
  reason?: 'alert' | 'offline' | 'user';
}

export function resolvePlacementIdForFocus(map: SpaceMap, target: SpatialFocusTarget): string | null {
  if (map.spaceId !== target.spaceId) return null;
  if (target.placementId && map.placements.some((p) => p.id === target.placementId)) {
    return target.placementId;
  }
  const bySensor = target.sensorId
    ? map.placements.find((p) => p.sensorId === target.sensorId)
    : undefined;
  if (bySensor) return bySensor.id;
  const byOutput = target.outputId
    ? map.placements.find((p) => p.outputId === target.outputId)
    : undefined;
  if (byOutput) return byOutput.id;
  if (target.deviceId) {
    const byDevice = map.placements.find((p) => p.deviceId === target.deviceId);
    if (byDevice) return byDevice.id;
  }
  return null;
}

export function spatialFocusForOfflineDevice(spaceId: string, deviceId: string): SpatialFocusTarget {
  return { spaceId, deviceId, reason: 'offline' };
}
