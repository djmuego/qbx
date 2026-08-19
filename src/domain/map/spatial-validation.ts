import type { MapPlacement, SpaceMap } from './space-map.types';
import type { SpaceDimensions } from '../space/space.types';

export type SpatialWarningCode =
  | 'outside_room'
  | 'above_ceiling'
  | 'below_floor'
  | 'intersects_wall'
  | 'floating_floor_object'
  | 'overlap_structure';

export interface SpatialWarning {
  code: SpatialWarningCode;
  placementId: string;
  message: string;
}

export function validateSpatialMap(map: SpaceMap, room: SpaceDimensions): SpatialWarning[] {
  const warnings: SpatialWarning[] = [];
  for (const p of map.placements) {
    if (p.xM < -0.02 || p.yM < -0.02 || p.xM + p.widthM > room.lengthM + 0.02 || p.yM + p.heightM > room.widthM + 0.02) {
      warnings.push({ code: 'outside_room', placementId: p.id, message: `${p.label ?? p.kind} выходит за границы помещения.` });
    }
    const top = (p.zM ?? 0) + (p.sizeZM ?? 0);
    if (top > room.heightM + 0.02) {
      warnings.push({ code: 'above_ceiling', placementId: p.id, message: `${p.label ?? p.kind} выше потолка.` });
    }
    if ((p.zM ?? 0) < -0.02) {
      warnings.push({ code: 'below_floor', placementId: p.id, message: `${p.label ?? p.kind} ниже пола.` });
    }
    if ((p.mounting === 'floor' || p.kind === 'structure' || p.kind === 'plant' || p.kind === 'plant_group') && (p.zM ?? 0) > 0.35) {
      warnings.push({ code: 'floating_floor_object', placementId: p.id, message: `${p.label ?? p.kind} слишком высоко для напольного объекта.` });
    }
  }
  const structures = map.placements.filter((p) => p.kind === 'structure');
  for (let i = 0; i < structures.length; i += 1) {
    for (let j = i + 1; j < structures.length; j += 1) {
      if (aabbOverlap(structures[i]!, structures[j]!)) {
        warnings.push({
          code: 'overlap_structure',
          placementId: structures[i]!.id,
          message: 'Крупные конструкции сильно пересекаются.',
        });
      }
    }
  }
  return warnings;
}

function aabbOverlap(a: MapPlacement, b: MapPlacement): boolean {
  return !(a.xM + a.widthM < b.xM || b.xM + b.widthM < a.xM || a.yM + a.heightM < b.yM || b.yM + b.heightM < a.yM);
}
