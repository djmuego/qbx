import type { SpatialEffectObservation } from '../../domain/map/spatial-intelligence.types';

const KEY = 'qbx_spatial_effects_v1';

function loadAll(): SpatialEffectObservation[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SpatialEffectObservation[]) : [];
  } catch {
    return [];
  }
}

function saveAll(items: SpatialEffectObservation[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
}

export function recordSpatialEffect(obs: Omit<SpatialEffectObservation, 'id'>): SpatialEffectObservation {
  const full: SpatialEffectObservation = { ...obs, id: `seff-${Date.now()}` };
  saveAll([full, ...loadAll()]);
  return full;
}

export function listSpatialEffects(spaceId: string): SpatialEffectObservation[] {
  return loadAll().filter((o) => o.spaceId === spaceId);
}
