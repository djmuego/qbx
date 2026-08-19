import type { Space, SpaceType } from '../space/space.types';

/** One Spatial Engine, four map scales. Not separate editors. */
export type SpatialScale = 'L1_MICRO' | 'L2_ROOM' | 'L3_FACILITY' | 'L4_SITE';

/**
 * Containment tree. V1 persists:
 * - Site/Building/Floor/Room as Space.parentId
 * - Zone as MapZone
 * - Rack/Bed/Plant as MapPlacement.parentId
 */
export type SpatialNodeKind = 'site' | 'building' | 'floor' | 'room' | 'zone' | 'rack' | 'bed' | 'plant';

export const SPATIAL_SCALE_LABELS: Record<SpatialScale, string> = {
  L1_MICRO: 'Микро',
  L2_ROOM: 'Помещение',
  L3_FACILITY: 'Объект',
  L4_SITE: 'Территория',
};

export function spatialScaleForType(type?: SpaceType, areaM2?: number): SpatialScale {
  if (type === 'site' || type === 'outdoor') return 'L4_SITE';
  if (type === 'facility') return 'L3_FACILITY';
  if (type === 'greenhouse' && (areaM2 ?? 0) >= 40) return 'L3_FACILITY';
  if (type === 'grow_tent' || type === 'grow_box') return 'L1_MICRO';
  return 'L2_ROOM';
}

export function spatialKindForType(type?: SpaceType): SpatialNodeKind {
  if (type === 'site' || type === 'outdoor') return 'site';
  if (type === 'facility') return 'building';
  return 'room';
}

export function childSpaces(spaces: Space[], parentId: string): Space[] {
  return spaces.filter((s) => s.parentId === parentId);
}

export function spaceAncestry(spaces: Space[], id: string): Space[] {
  const byId = new Map(spaces.map((s) => [s.id, s]));
  const chain: Space[] = [];
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    chain.unshift(current);
    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}
