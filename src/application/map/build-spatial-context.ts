import type { Space } from '../../domain/space/space.types';
import type { SpaceMap, MapPlacement } from '../../domain/map/space-map.types';
import type { Plant } from '../../domain/grow/plant.types';
import type { Device } from '../../domain/device/device.types';
import type { GrowPhaseId } from '../../domain/grow/grow-phase.types';
import {
  plantAgeDays,
  resolvePlacementGrowthVisual,
  type PlantVisualStage,
} from '../../domain/grow/plant-growth-visual';
import { categoryForPlacement } from '../../domain/map/map-visual-language';

export interface SpatialContextPlant {
  plantId: string;
  placementId: string;
  name: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  ageDays: number;
  stage: PlantVisualStage | null;
  canopyDiameterM: number | null;
  plantHeightM: number | null;
  zoneId?: string;
  bound: boolean;
}

export interface SpatialContextDevice {
  placementId: string;
  kind: string;
  category: string;
  label: string;
  xM: number;
  yM: number;
  deviceId?: string;
  sensorId?: string;
  outputId?: string;
  zoneId?: string;
}

export interface SpatialContextZone {
  id: string;
  name: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  plantCount: number;
  deviceCount: number;
}

export interface SpatialContextSummary {
  spaceId: string;
  spaceName: string;
  dimensions: { lengthM: number; widthM: number; heightM: number };
  areaM2: number;
  plantCount: number;
  devicePlacementCount: number;
  zoneCount: number;
  unboundPlacements: number;
}

export interface SpatialContext {
  summary: SpatialContextSummary;
  plants: SpatialContextPlant[];
  devices: SpatialContextDevice[];
  zones: SpatialContextZone[];
}

function placementLabel(p: MapPlacement, plants: Plant[]): string {
  if (p.label) return p.label;
  if (p.plantId) {
    const plant = plants.find((x) => x.id === p.plantId);
    if (plant) return plant.name;
  }
  return p.kind;
}

function isBound(p: MapPlacement): boolean {
  return Boolean(p.deviceId || p.sensorId || p.outputId);
}

export function buildSpatialContext(input: {
  space: Space;
  map: SpaceMap;
  plants: Plant[];
  devices: Device[];
  growPhase?: GrowPhaseId;
  cropStartedAt?: string;
}): SpatialContext {
  const { space, map, plants, growPhase, cropStartedAt } = input;
  const dims = space.dimensions ?? { lengthM: 0, widthM: 0, heightM: 0 };
  const areaM2 = dims.lengthM * dims.widthM;

  const contextPlants: SpatialContextPlant[] = [];
  const contextDevices: SpatialContextDevice[] = [];

  for (const p of map.placements) {
    const plant = p.plantId ? plants.find((x) => x.id === p.plantId) : undefined;
    if (p.kind === 'plant' || p.kind === 'plant_group') {
      const growth = resolvePlacementGrowthVisual(p, plant, { growPhase, cropStartedAt });
      const manualH = plant?.growthMode === 'manual' ? plant.plantHeightM : undefined;
      const manualC = plant?.growthMode === 'manual' ? plant.canopyDiameterM : undefined;
      contextPlants.push({
        plantId: p.plantId ?? p.id,
        placementId: p.id,
        name: placementLabel(p, plants),
        xM: p.xM,
        yM: p.yM,
        widthM: p.widthM,
        heightM: p.heightM,
        ageDays: growth?.ageDays ?? plantAgeDays(plant?.plantedAt, cropStartedAt),
        stage: growth?.stage ?? null,
        canopyDiameterM: manualC ?? p.canopyDiameterM ?? (growth ? p.widthM * growth.scale : null),
        plantHeightM: manualH ?? p.plantHeightM ?? p.sizeZM ?? null,
        zoneId: p.zoneId,
        bound: isBound(p),
      });
      continue;
    }
    contextDevices.push({
      placementId: p.id,
      kind: p.kind,
      category: categoryForPlacement(p),
      label: placementLabel(p, plants),
      xM: p.xM,
      yM: p.yM,
      deviceId: p.deviceId,
      sensorId: p.sensorId,
      outputId: p.outputId,
      zoneId: p.zoneId,
    });
  }

  const zones: SpatialContextZone[] = map.zones.map((z) => ({
    id: z.id,
    name: z.name,
    xM: z.xM,
    yM: z.yM,
    widthM: z.widthM,
    heightM: z.heightM,
    plantCount: map.placements.filter((p) => p.zoneId === z.id && (p.kind === 'plant' || p.kind === 'plant_group')).length,
    deviceCount: map.placements.filter((p) => p.zoneId === z.id && p.kind !== 'plant' && p.kind !== 'plant_group').length,
  }));

  return {
    summary: {
      spaceId: space.id,
      spaceName: space.name,
      dimensions: dims,
      areaM2,
      plantCount: contextPlants.length,
      devicePlacementCount: contextDevices.length,
      zoneCount: zones.length,
      unboundPlacements: map.placements.filter((p) => !isBound(p) && p.kind !== 'plant' && p.kind !== 'plant_group').length,
    },
    plants: contextPlants,
    devices: contextDevices,
    zones,
  };
}
