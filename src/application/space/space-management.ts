import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { Plant, PlantGroup } from '../../domain/grow/plant.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import type { Space } from '../../domain/space/space.types';

export interface SpaceDataSnapshot {
  spaces: Space[];
  devices: Device[];
  automations: Automation[];
  spaceMaps: SpaceMap[];
  plants: Plant[];
  plantGroups: PlantGroup[];
}

export interface SpaceSummary {
  deviceCount: number;
  automationCount: number;
  plantCount: number;
  mapObjectCount: number;
}

export function summarizeSpace(snapshot: SpaceDataSnapshot, spaceId: string): SpaceSummary {
  const map = snapshot.spaceMaps.find((m) => m.spaceId === spaceId);
  return {
    deviceCount: snapshot.devices.filter((d) => d.spaceId === spaceId).length,
    automationCount: snapshot.automations.filter((a) => a.spaceId === spaceId).length,
    plantCount: snapshot.plants.filter((p) => p.spaceId === spaceId).length,
    mapObjectCount: map?.placements.length ?? 0,
  };
}

export interface DuplicateSpaceBundle {
  space: Space;
  devices: Device[];
  automations: Automation[];
  spaceMap: SpaceMap | null;
  plants: Plant[];
  plantGroups: PlantGroup[];
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function cloneDevice(device: Device, newSpaceId: string): {
  device: Device;
  sensorIds: Map<string, string>;
  outputIds: Map<string, string>;
} {
  const newDeviceId = uid('dev');
  const sensorIds = new Map<string, string>();
  const outputIds = new Map<string, string>();

  const mapSensors = (list: Device['inputs']) =>
    list.map((s, i) => {
      const newId = `${newDeviceId}-in${i + 1}`;
      sensorIds.set(s.id, newId);
      return { ...s, id: newId, deviceId: newDeviceId };
    });

  const inputs = mapSensors(device.inputs);
  const sensors = mapSensors(device.sensors);
  const outputs = device.outputs.map((o, i) => {
    const newId = `${newDeviceId}-out${i + 1}`;
    outputIds.set(o.id, newId);
    return { ...o, id: newId, deviceId: newDeviceId };
  });

  return {
    device: {
      ...device,
      id: newDeviceId,
      spaceId: newSpaceId,
      inputs,
      sensors,
      outputs,
      status: 'offline',
      isOnline: false,
      addedAt: new Date().toISOString(),
    },
    sensorIds,
    outputIds,
  };
}

export function buildDuplicateSpaceBundle(
  snapshot: SpaceDataSnapshot,
  sourceSpaceId: string,
  name?: string,
): DuplicateSpaceBundle | null {
  const source = snapshot.spaces.find((s) => s.id === sourceSpaceId);
  if (!source) return null;

  const newSpaceId = uid('space');
  const space: Space = {
    ...source,
    id: newSpaceId,
    name: name?.trim() || `${source.name} (копия)`,
    isDefault: false,
  };

  const deviceClones: Device[] = [];
  const sensorIdMap = new Map<string, string>();
  const outputIdMap = new Map<string, string>();
  const deviceIdMap = new Map<string, string>();

  for (const device of snapshot.devices.filter((d) => d.spaceId === sourceSpaceId)) {
    const cloned = cloneDevice(device, newSpaceId);
    deviceIdMap.set(device.id, cloned.device.id);
    cloned.sensorIds.forEach((v, k) => sensorIdMap.set(k, v));
    cloned.outputIds.forEach((v, k) => outputIdMap.set(k, v));
    deviceClones.push(cloned.device);
  }

  const plantIdMap = new Map<string, string>();
  const plants = snapshot.plants
    .filter((p) => p.spaceId === sourceSpaceId)
    .map((p) => {
      const newId = uid('plant');
      plantIdMap.set(p.id, newId);
      return { ...p, id: newId, spaceId: newSpaceId };
    });

  const plantGroups = snapshot.plantGroups
    .filter((g) => g.spaceId === sourceSpaceId)
    .map((g) => {
      const newId = uid('pg');
      return {
        ...g,
        id: newId,
        spaceId: newSpaceId,
        plantIds: g.plantIds.map((pid) => plantIdMap.get(pid) ?? pid),
      };
    });

  const sourceMap = snapshot.spaceMaps.find((m) => m.spaceId === sourceSpaceId);
  let spaceMap: SpaceMap | null = null;
  if (sourceMap) {
    const placementIdMap = new Map<string, string>();
    const placements = sourceMap.placements.map((p) => {
      const newPlacementId = uid('pl');
      placementIdMap.set(p.id, newPlacementId);
      return {
        ...p,
        id: newPlacementId,
        deviceId: p.deviceId ? deviceIdMap.get(p.deviceId) : undefined,
        sensorId: p.sensorId ? sensorIdMap.get(p.sensorId) : undefined,
        outputId: p.outputId ? outputIdMap.get(p.outputId) : undefined,
        plantId: p.plantId ? plantIdMap.get(p.plantId) : undefined,
        parentId: p.parentId ? placementIdMap.get(p.parentId) ?? p.parentId : undefined,
        childSpaceId: undefined,
      };
    });
    spaceMap = {
      ...sourceMap,
      spaceId: newSpaceId,
      placements,
      zones: sourceMap.zones.map((z) => ({ ...z, id: uid('zone') })),
      relationships: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const automations = snapshot.automations
    .filter((a) => a.spaceId === sourceSpaceId)
    .map((a) => {
      const next: Automation = {
        ...a,
        id: uid('auto'),
        spaceId: newSpaceId,
        enabled: false,
        isEnabled: false,
        runtimeStatus: 'disabled',
      };
      if (next.action) {
        next.action = {
          ...next.action,
          targetDeviceId: deviceIdMap.get(next.action.targetDeviceId) ?? next.action.targetDeviceId,
          targetOutputId: outputIdMap.get(next.action.targetOutputId) ?? next.action.targetOutputId,
        };
      }
      if (next.trigger?.type === 'sensor') {
        next.trigger = {
          ...next.trigger,
          sensorDeviceId: deviceIdMap.get(next.trigger.sensorDeviceId) ?? next.trigger.sensorDeviceId,
          sensorInputId: sensorIdMap.get(next.trigger.sensorInputId) ?? next.trigger.sensorInputId,
        };
      }
      if (next.sensorDeviceId) {
        next.sensorDeviceId = deviceIdMap.get(next.sensorDeviceId) ?? next.sensorDeviceId;
      }
      if (next.sensorInputId) {
        next.sensorInputId = sensorIdMap.get(next.sensorInputId) ?? next.sensorInputId;
      }
      if (next.targetDeviceId) {
        next.targetDeviceId = deviceIdMap.get(next.targetDeviceId) ?? next.targetDeviceId;
      }
      if (next.targetOutputId) {
        next.targetOutputId = outputIdMap.get(next.targetOutputId) ?? next.targetOutputId;
      }
      return next;
    });

  return { space, devices: deviceClones, automations, spaceMap, plants, plantGroups };
}
