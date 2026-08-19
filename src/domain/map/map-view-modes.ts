import type { SpatialLayerId } from './spatial-layers';
import { DEFAULT_SPATIAL_LAYERS } from './spatial-layers';

export type MapViewModeId = 'plan' | 'climate' | 'light' | 'irrigation' | 'electrical';

export const MAP_VIEW_MODE_LABELS: Record<MapViewModeId, string> = {
  plan: 'План',
  climate: 'Климат',
  light: 'Свет',
  irrigation: 'Полив',
  electrical: 'Электрика',
};

const MODE_LAYERS: Record<MapViewModeId, Partial<Record<SpatialLayerId, boolean>>> = {
  plan: {},
  climate: {
    plants: true,
    sensors: true,
    climate: true,
    structures: true,
    zones: false,
    lighting: false,
    irrigation: false,
    water: false,
    electrical: false,
    equipment: false,
    beds: false,
    rows: false,
    paths: false,
    utilities: false,
    qbx: true,
    cameras: false,
    infrastructure: false,
    weather: false,
    solar: false,
    analysis: false,
  },
  light: {
    plants: true,
    lighting: true,
    structures: true,
    sensors: false,
    climate: false,
    irrigation: false,
    water: false,
    electrical: false,
    equipment: false,
    beds: true,
    rows: true,
    paths: false,
    utilities: false,
    qbx: false,
    cameras: false,
    zones: false,
    infrastructure: false,
    weather: false,
    solar: false,
    analysis: false,
  },
  irrigation: {
    plants: true,
    irrigation: true,
    water: true,
    structures: true,
    sensors: false,
    climate: false,
    lighting: false,
    electrical: false,
    equipment: false,
    beds: true,
    rows: true,
    paths: true,
    utilities: true,
    qbx: false,
    cameras: false,
    zones: false,
    infrastructure: false,
    weather: false,
    solar: false,
    analysis: false,
  },
  electrical: {
    plants: false,
    electrical: true,
    qbx: true,
    lighting: true,
    climate: true,
    irrigation: false,
    water: false,
    sensors: false,
    structures: true,
    equipment: true,
    beds: false,
    rows: false,
    paths: false,
    utilities: true,
    cameras: false,
    zones: false,
    infrastructure: true,
    weather: false,
    solar: false,
    analysis: false,
  },
};

export function layersForMapViewMode(mode: MapViewModeId): Record<SpatialLayerId, boolean> {
  const patch = MODE_LAYERS[mode];
  if (mode === 'plan' || Object.keys(patch).length === 0) {
    return { ...DEFAULT_SPATIAL_LAYERS };
  }
  const next = { ...DEFAULT_SPATIAL_LAYERS };
  for (const key of Object.keys(patch) as SpatialLayerId[]) {
    next[key] = patch[key]!;
  }
  return next;
}
