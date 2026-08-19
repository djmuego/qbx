import type { MapObjectKind, MapPlacement } from './space-map.types';

export type MapVisualCategory =
  | 'plant'
  | 'light'
  | 'climate'
  | 'sensor'
  | 'irrigation'
  | 'water'
  | 'camera'
  | 'controller'
  | 'infrastructure'
  | 'electrical'
  | 'zone'
  | 'misc';

export interface MapVisualDescriptor {
  category: MapVisualCategory;
  symbol: string;
  fill: string;
  stroke: string;
  text: string;
}

const CATEGORY_STYLES: Record<MapVisualCategory, { fill: string; stroke: string; text: string }> = {
  plant: { fill: '#d1fae5', stroke: '#059669', text: '#065f46' },
  light: { fill: '#fef3c7', stroke: '#d97706', text: '#92400e' },
  climate: { fill: '#f4f4f5', stroke: '#52525b', text: '#27272a' },
  sensor: { fill: '#e0f2fe', stroke: '#0284c7', text: '#075985' },
  irrigation: { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a8a' },
  water: { fill: '#dbeafe', stroke: '#1d4ed8', text: '#1e3a8a' },
  camera: { fill: '#fae8ff', stroke: '#c026d3', text: '#86198f' },
  controller: { fill: '#ede9fe', stroke: '#7c3aed', text: '#5b21b6' },
  infrastructure: { fill: '#f5f5f4', stroke: '#78716c', text: '#44403c' },
  electrical: { fill: '#ffedd5', stroke: '#ea580c', text: '#9a3412' },
  zone: { fill: '#ecfdf5', stroke: '#10b981', text: '#047857' },
  misc: { fill: '#f4f4f5', stroke: '#a1a1aa', text: '#3f3f46' },
};

function roleOf(placement: Pick<MapPlacement, 'kind' | 'role' | 'catalogId'>): string {
  return (placement.role ?? placement.catalogId ?? '').toLowerCase();
}

export function categoryForPlacement(placement: Pick<MapPlacement, 'kind' | 'role' | 'catalogId'>): MapVisualCategory {
  const role = roleOf(placement);
  if (placement.kind === 'plant' || placement.kind === 'plant_group') return 'plant';
  if (placement.kind === 'light') return 'light';
  if (placement.kind === 'sensor') return 'sensor';
  if (placement.kind === 'camera') return 'camera';
  if (placement.kind === 'hub') return 'controller';
  if (placement.kind === 'outlet' || placement.kind === 'electrical_panel') return 'electrical';
  if (placement.kind === 'irrigation') {
    if (role === 'reservoir' || role === 'tank') return 'water';
    return 'irrigation';
  }
  if (role === 'exhaust' || role === 'circulation' || role === 'intake' || role === 'humidifier' || role === 'heater' || role === 'hvac') {
    return 'climate';
  }
  if (placement.kind === 'equipment') return 'climate';
  if (placement.kind === 'structure') return 'infrastructure';
  return 'misc';
}

export function symbolForPlacement(placement: Pick<MapPlacement, 'kind' | 'role' | 'catalogId'>): string {
  const role = roleOf(placement);
  if (placement.kind === 'plant' || placement.kind === 'plant_group') return '🌱';
  if (placement.kind === 'light') return '💡';
  if (placement.kind === 'sensor') return '🌡';
  if (placement.kind === 'camera') return '📷';
  if (placement.kind === 'hub') return '⚡';
  if (placement.kind === 'outlet') return '🔌';
  if (placement.kind === 'electrical_panel') return '⬛';
  if (placement.kind === 'irrigation') {
    if (role === 'pump') return '⚙';
    if (role === 'reservoir' || role === 'tank') return '💧';
    return '〰';
  }
  if (role === 'exhaust' || role === 'intake') return '🌀';
  if (role === 'circulation') return '💨';
  if (role === 'humidifier' || role === 'dehumidifier') return '💦';
  if (role === 'heater' || role === 'hvac') return '🔥';
  if (role === 'table' || role === 'grow_bed' || role === 'tray') return '▭';
  if (role === 'rack' || role === 'grow_rack') return '☰';
  if (placement.kind === 'structure') return '▢';
  if (placement.kind === 'equipment') return '⚙';
  return '•';
}

export function describeMapVisual(
  placement: MapPlacement,
  options?: { offline?: boolean; unbound?: boolean },
): MapVisualDescriptor {
  const category = categoryForPlacement(placement);
  const base = CATEGORY_STYLES[category];
  return {
    category,
    symbol: symbolForPlacement(placement),
    fill: options?.offline ? '#f4f4f5' : base.fill,
    stroke: options?.offline ? '#a1a1aa' : options?.unbound ? '#f59e0b' : base.stroke,
    text: base.text,
  };
}

/** Canvas label: only when selected or hovered — never default equipment names on map. */
export function shouldShowCanvasLabel(
  placement: MapPlacement,
  options: { selected?: boolean; hovered?: boolean },
): boolean {
  if (options.selected || options.hovered) return true;
  if (placement.kind === 'plant' || placement.kind === 'plant_group') return false;
  return false;
}

export function canvasLabelForPlacement(
  placement: MapPlacement,
  name?: string,
): string {
  return placement.label || name || '';
}
