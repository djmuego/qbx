import type { MapObjectKind, MapPlacement, SpaceMap } from '../../domain/map/space-map.types';
import type { SpaceDimensions } from '../../domain/space/space.types';

export function defaultSizeZForKind(kind: MapObjectKind): number {
  switch (kind) {
    case 'plant':
      return 0.45;
    case 'plant_group':
      return 0.5;
    case 'light':
      return 0.06;
    case 'sensor':
      return 0.08;
    case 'equipment':
      return 0.22;
    case 'irrigation':
      return 0.28;
    case 'structure':
      return 0.4;
    case 'camera':
      return 0.1;
    case 'hub':
      return 0.16;
    case 'outlet':
      return 0.08;
    case 'electrical_panel':
      return 0.4;
    default:
      return 0.2;
  }
}

export function defaultZForKind(kind: MapObjectKind, roomHeightM: number): number {
  const h = Math.max(roomHeightM, 0.6);
  switch (kind) {
    case 'plant':
    case 'plant_group':
      return 0;
    case 'structure':
      return 0;
    case 'irrigation':
      return 0;
    case 'light':
      return Math.max(0.4, h - 0.22);
    case 'sensor':
      return Math.min(0.55, h * 0.28);
    case 'equipment':
      return Math.min(h * 0.55, h - 0.3);
    case 'camera':
      return Math.min(h * 0.78, h - 0.2);
    case 'hub':
      return Math.min(1, h * 0.45);
    case 'outlet':
      return Math.min(0.4, h * 0.2);
    case 'electrical_panel':
      return Math.min(1.1, h * 0.4);
    default:
      return 0;
  }
}

function isElevatedKind(kind: MapObjectKind): boolean {
  return kind === 'light' || kind === 'sensor' || kind === 'equipment' || kind === 'camera' || kind === 'hub' || kind === 'outlet' || kind === 'electrical_panel';
}

export function needsDefaultZ(placement: MapPlacement): boolean {
  if (placement.zSource === 'user') return false;
  if (placement.zSource === 'default_visualization' && placement.sizeZM != null) return false;
  if (!isElevatedKind(placement.kind)) return placement.sizeZM == null;
  return placement.zM == null || placement.zM === 0 || placement.zSource == null;
}

export function migratePlacementTo3D(placement: MapPlacement, room: SpaceDimensions): MapPlacement {
  if (placement.zSource === 'user') {
    return { ...placement, sizeZM: placement.sizeZM ?? defaultSizeZForKind(placement.kind) };
  }
  if (!needsDefaultZ(placement) && placement.sizeZM != null) return placement;
  const sizeZM = placement.sizeZM ?? defaultSizeZForKind(placement.kind);
  const zM = isElevatedKind(placement.kind) || placement.zM == null ? defaultZForKind(placement.kind, room.heightM) : (placement.zM ?? 0);
  return {
    ...placement,
    zM,
    sizeZM,
    zSource: 'default_visualization',
    mounting:
      placement.mounting ??
      (placement.kind === 'light'
        ? 'hanging'
        : placement.kind === 'camera' || placement.kind === 'hub' || placement.kind === 'equipment'
          ? 'wall'
          : 'floor'),
  };
}

export function migrateMapTo3D(map: SpaceMap, room: SpaceDimensions): SpaceMap {
  return {
    ...map,
    placements: map.placements.map((p) => migratePlacementTo3D(p, room)),
    heightsAreDefaults: map.placements.some((p) => p.zSource === 'user') ? map.heightsAreDefaults : true,
    updatedAt: map.updatedAt,
  };
}
