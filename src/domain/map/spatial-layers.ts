import type { MapObjectKind } from './space-map.types';

export type SpatialLayerId =
  | 'plants'
  | 'beds'
  | 'rows'
  | 'paths'
  | 'structures'
  | 'equipment'
  | 'sensors'
  | 'lighting'
  | 'climate'
  | 'irrigation'
  | 'water'
  | 'utilities'
  | 'qbx'
  | 'cameras'
  | 'zones'
  | 'infrastructure'
  | 'electrical'
  | 'weather'
  | 'solar'
  | 'analysis';

export const SPATIAL_LAYER_LABELS: Record<SpatialLayerId, string> = {
  plants: 'Растения',
  beds: 'Грядки',
  rows: 'Ряды',
  paths: 'Дорожки',
  structures: 'Конструкции',
  equipment: 'Оборудование',
  sensors: 'Датчики',
  lighting: 'Свет',
  climate: 'Климат',
  irrigation: 'Полив',
  water: 'Вода',
  utilities: 'Утилиты',
  qbx: 'QBX',
  cameras: 'Камеры',
  zones: 'Зоны',
  infrastructure: 'Инфраструктура',
  electrical: 'Электрика',
  weather: 'Погода',
  solar: 'Солнце',
  analysis: 'AI Analysis',
};

export const DEFAULT_SPATIAL_LAYERS: Record<SpatialLayerId, boolean> = {
  plants: true,
  beds: true,
  rows: true,
  paths: true,
  structures: true,
  equipment: true,
  sensors: true,
  lighting: true,
  climate: true,
  irrigation: true,
  water: true,
  utilities: true,
  qbx: true,
  cameras: true,
  zones: true,
  infrastructure: true,
  electrical: false,
  weather: false,
  solar: false,
  analysis: false,
};

export function layerForKind(kind: MapObjectKind, role?: string): SpatialLayerId {
  if (kind === 'plant' || kind === 'plant_group') {
    if (role === 'row' || role === 'crop_row') return 'rows';
    return 'plants';
  }
  if (role === 'grow_bed') return 'beds';
  if (role === 'path' || role === 'walkway') return 'paths';
  if (role === 'greenhouse' || role === 'fence' || role === 'gate' || role === 'shade_net' || role === 'shed') {
    return 'structures';
  }
  if (role === 'weather_station') return 'sensors';
  if (role === 'reservoir' || role === 'tank') return 'water';
  if (role === 'pump' || role === 'manifold' || role === 'utility_box' || role === 'pump_station') return 'utilities';
  if (kind === 'sensor') return 'sensors';
  if (kind === 'light') return 'lighting';
  if (kind === 'camera') return 'cameras';
  if (kind === 'irrigation' || role === 'reservoir' || role === 'pump') return 'irrigation';
  if (kind === 'hub') return 'qbx';
  if (kind === 'outlet' || kind === 'electrical_panel') return 'electrical';
  if (kind === 'structure' || role === 'table' || role === 'rack' || role === 'grow_rack') return 'equipment';
  if (role === 'exhaust' || role === 'circulation' || role === 'intake' || role === 'humidifier' || role === 'dehumidifier' || role === 'heater' || role === 'hvac') {
    return 'climate';
  }
  if (kind === 'equipment') return 'climate';
  return 'infrastructure';
}
