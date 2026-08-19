import type { MapObjectKind, MapPlacement } from './space-map.types';
import type { ObjectLibraryItem } from './spatial-object-library';

export interface PlacementDefaultPose {
  mounting: MapPlacement['mounting'];
  zM?: number;
  sizeZM?: number;
}

export function defaultPoseForKind(
  kind: MapObjectKind,
  role?: string,
): PlacementDefaultPose {
  const r = (role ?? '').toLowerCase();
  if (kind === 'plant' || kind === 'plant_group') {
    return { mounting: 'floor', zM: 0, sizeZM: kind === 'plant_group' ? 0.5 : 0.45 };
  }
  if (kind === 'light') {
    return { mounting: 'ceiling', zM: undefined, sizeZM: 0.08 };
  }
  if (kind === 'sensor') {
    return { mounting: 'plantCanopy', zM: 1.2, sizeZM: 0.12 };
  }
  if (kind === 'camera') {
    return { mounting: 'wall', zM: 2.2, sizeZM: 0.15 };
  }
  if (kind === 'hub') {
    return { mounting: 'wall', zM: 1.4, sizeZM: 0.2 };
  }
  if (kind === 'irrigation') {
    if (r === 'pump') return { mounting: 'floor', zM: 0, sizeZM: 0.25 };
    if (r === 'reservoir' || r === 'tank') return { mounting: 'floor', zM: 0, sizeZM: 0.5 };
    return { mounting: 'floor', zM: 0, sizeZM: 0.1 };
  }
  if (r === 'exhaust' || r === 'intake') {
    return { mounting: 'wall', zM: 2.4, sizeZM: 0.35 };
  }
  if (r === 'circulation') {
    return { mounting: 'wall', zM: 1.8, sizeZM: 0.3 };
  }
  if (r === 'humidifier' || r === 'dehumidifier' || r === 'heater' || r === 'hvac') {
    return { mounting: 'floor', zM: 0, sizeZM: 0.5 };
  }
  if (kind === 'structure') {
    if (r === 'table' || r === 'grow_bed' || r === 'tray') return { mounting: 'floor', zM: 0.8, sizeZM: 0.8 };
    if (r === 'rack' || r === 'grow_rack') return { mounting: 'floor', zM: 0, sizeZM: 1.8 };
    return { mounting: 'floor', zM: 0, sizeZM: 2 };
  }
  if (kind === 'outlet' || kind === 'electrical_panel') {
    return { mounting: 'wall', zM: 0.3, sizeZM: 0.25 };
  }
  return { mounting: 'floor', zM: 0, sizeZM: 0.3 };
}

export function applyLibraryDefaults(item: ObjectLibraryItem): Partial<MapPlacement> {
  const pose = defaultPoseForKind(item.kind, item.role);
  return {
    kind: item.kind,
    role: item.role,
    catalogId: item.id,
    widthM: item.widthM,
    heightM: item.heightM,
    sizeZM: item.sizeZM ?? pose.sizeZM,
    mounting: item.mounting ?? pose.mounting,
    zM: pose.zM,
    zSource: pose.zM != null ? 'default_visualization' : undefined,
  };
}
