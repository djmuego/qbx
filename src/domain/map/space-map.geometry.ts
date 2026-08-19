import type {
  CompassQuadrant,
  CreatePlacementInput,
  MapObjectKind,
  MapPlacement,
  MapZone,
  PointM,
  SpaceBounds,
  SpaceGeometrySnapshot,
  SpaceMap,
} from './space-map.types';

export const DEFAULT_GRID_STEP_M = 0.1;

export const DEFAULT_KIND_SIZE_M: Record<MapObjectKind, { widthM: number; heightM: number }> = {
  plant: { widthM: 0.3, heightM: 0.3 },
  plant_group: { widthM: 1, heightM: 1 },
  sensor: { widthM: 0.2, heightM: 0.2 },
  equipment: { widthM: 0.4, heightM: 0.4 },
  light: { widthM: 0.6, heightM: 0.3 },
  irrigation: { widthM: 0.3, heightM: 0.3 },
  structure: { widthM: 1, heightM: 0.4 },
  camera: { widthM: 0.2, heightM: 0.2 },
  hub: { widthM: 0.25, heightM: 0.2 },
  outlet: { widthM: 0.1, heightM: 0.08 },
  electrical_panel: { widthM: 0.3, heightM: 0.12 },
};

function roundMeters(value: number): number {
  return Number(value.toFixed(4));
}

export function snapToGrid(valueM: number, stepM = DEFAULT_GRID_STEP_M): number {
  if (!Number.isFinite(valueM) || stepM <= 0) return 0;
  return roundMeters(Math.round(valueM / stepM) * stepM);
}

export function createEmptySpaceMap(spaceId: string, now = new Date().toISOString()): SpaceMap {
  return {
    spaceId,
    schemaVersion: 1,
    gridStepM: DEFAULT_GRID_STEP_M,
    northOffsetDeg: 0,
    zones: [],
    placements: [],
    updatedAt: now,
  };
}

let placementSeq = 0;

export function createPlacement(input: CreatePlacementInput): MapPlacement {
  const size = DEFAULT_KIND_SIZE_M[input.kind];
  placementSeq += 1;
  const { id, kind, xM, yM, zM, widthM, heightM, rotationDeg, ...rest } = input;
  return {
    ...rest,
    id: id ?? `plc-${Date.now()}-${placementSeq}`,
    kind,
    xM: xM ?? 0,
    yM: yM ?? 0,
    zM: zM ?? 0,
    widthM: widthM ?? size.widthM,
    heightM: heightM ?? size.heightM,
    rotationDeg: rotationDeg ?? 0,
  };
}

export function placementCenter(placement: Pick<MapPlacement, 'xM' | 'yM' | 'widthM' | 'heightM'>): PointM {
  return {
    xM: placement.xM + placement.widthM / 2,
    yM: placement.yM + placement.heightM / 2,
  };
}

export function distanceM(a: PointM, b: PointM): number {
  return Math.hypot(b.xM - a.xM, b.yM - a.yM);
}

export function gridStepForScale(lengthM: number, widthM: number): number {
  const maxDim = Math.max(lengthM, widthM);
  if (maxDim <= 3.5) return 0.1;
  if (maxDim <= 8) return 0.2;
  if (maxDim <= 25) return 1;
  if (maxDim <= 60) return 2;
  return 5;
}


export function isPointInZone(xM: number, yM: number, zone: MapZone): boolean {
  return xM >= zone.xM && xM <= zone.xM + zone.widthM && yM >= zone.yM && yM <= zone.yM + zone.heightM;
}

export function isPlacementInZone(placement: MapPlacement, zone: MapZone): boolean {
  const center = placementCenter(placement);
  return isPointInZone(center.xM, center.yM, zone);
}

export function zoneContaining(placement: MapPlacement, zones: MapZone[]): MapZone | undefined {
  return zones.find((zone) => isPlacementInZone(placement, zone));
}

export function nearestPlacement(from: MapPlacement, candidates: MapPlacement[]): MapPlacement | undefined {
  if (candidates.length === 0) return undefined;
  const origin = placementCenter(from);
  let best = candidates[0]!;
  let bestDistance = distanceM(origin, placementCenter(best));
  for (const candidate of candidates.slice(1)) {
    const d = distanceM(origin, placementCenter(candidate));
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

export function compassQuadrant(xM: number, yM: number, bounds: SpaceBounds): CompassQuadrant {
  const east = xM >= bounds.lengthM / 2;
  const north = yM >= bounds.widthM / 2;
  if (north && !east) return 'NW';
  if (north && east) return 'NE';
  if (!north && !east) return 'SW';
  return 'SE';
}

export function clampPlacementToBounds(placement: MapPlacement, bounds: SpaceBounds, stepM = DEFAULT_GRID_STEP_M): MapPlacement {
  const maxW = Math.max(stepM, bounds.lengthM);
  const maxH = Math.max(stepM, bounds.widthM);
  const widthM = snapToGrid(Math.min(placement.widthM, maxW), stepM);
  const heightM = snapToGrid(Math.min(placement.heightM, maxH), stepM);
  const maxX = Math.max(0, bounds.lengthM - widthM);
  const maxY = Math.max(0, bounds.widthM - heightM);
  return {
    ...placement,
    widthM,
    heightM,
    xM: snapToGrid(Math.min(Math.max(0, placement.xM), maxX), stepM),
    yM: snapToGrid(Math.min(Math.max(0, placement.yM), maxY), stepM),
  };
}

export function clampZoneToBounds(zone: MapZone, bounds: SpaceBounds, stepM = DEFAULT_GRID_STEP_M): MapZone {
  const asPlacement = clampPlacementToBounds(
    {
      id: zone.id,
      kind: 'structure',
      xM: zone.xM,
      yM: zone.yM,
      widthM: zone.widthM,
      heightM: zone.heightM,
      rotationDeg: 0,
    },
    bounds,
    stepM,
  );
  return {
    ...zone,
    xM: asPlacement.xM,
    yM: asPlacement.yM,
    widthM: asPlacement.widthM,
    heightM: asPlacement.heightM,
  };
}

export function clampMapToDimensions(map: SpaceMap, bounds: SpaceBounds): SpaceMap {
  const stepM = map.gridStepM || DEFAULT_GRID_STEP_M;
  return {
    ...map,
    placements: map.placements.map((p) => clampPlacementToBounds(p, bounds, stepM)),
    zones: map.zones.map((z) => clampZoneToBounds(z, bounds, stepM)),
    updatedAt: new Date().toISOString(),
  };
}

export function nextZoneName(existing: MapZone[]): string {
  const used = new Set(existing.map((z) => z.name));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const letter of alphabet) {
    const name = `Zone ${letter}`;
    if (!used.has(name)) return name;
  }
  return `Zone ${existing.length + 1}`;
}

export function toGeometrySnapshot(
  bounds: SpaceBounds & { heightM?: number },
  map: SpaceMap | null | undefined,
): SpaceGeometrySnapshot {
  const placements = map?.placements ?? [];
  return {
    lengthM: bounds.lengthM,
    widthM: bounds.widthM,
    heightM: bounds.heightM,
    zoneCount: map?.zones.length ?? 0,
    placementCount: placements.length,
    placements: placements.map((p) => ({
      kind: p.kind,
      xM: p.xM,
      yM: p.yM,
      zM: p.zM,
      zoneId: p.zoneId,
      plantId: p.plantId,
      sensorId: p.sensorId,
      outputId: p.outputId,
      deviceId: p.deviceId,
      parentId: p.parentId,
      role: p.role,
    })),
  };
}
