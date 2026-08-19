import type { VisualAssetDescriptor, VisualAssetId } from '../../domain/map/visual-assets.types';
import type { MapObjectKind } from '../../domain/map/space-map.types';
import { spatialAssetById } from '../../features/map3d/registry/spatial-asset-registry';
import { resolveSpatialAsset } from '../../features/map3d/assets/resolve-spatial-asset';

const LEGACY_TO_SPATIAL: Record<VisualAssetId, string> = {
  plant: 'plant.vegetative',
  pot: 'plant.generic',
  growLight: 'light.panel',
  exhaustFan: 'climate.exhaust-fan',
  circulationFan: 'climate.circulation-fan',
  sensor: 'sensor.environment',
  camera: 'camera.generic',
  tank: 'irrigation.tank',
  pump: 'irrigation.pump',
  hub: 'qbx.controller',
  hvac: 'climate.humidifier',
};

export function resolveVisualAsset(id: VisualAssetId): VisualAssetDescriptor {
  const spatial = spatialAssetById(LEGACY_TO_SPATIAL[id] ?? id);
  const render =
    spatial?.renderType === 'sprite' ? 'sprite' : spatial?.renderType === 'model' ? 'glb' : 'procedural';
  return {
    id,
    render,
    proceduralKey: id,
    glbUrl: spatial?.glbUrl,
  };
}

export function visualAssetForPlacement(kind: MapObjectKind, role?: string): VisualAssetId {
  const resolved = resolveSpatialAsset({ kind, role, widthM: 0.3 });
  if (resolved.id.startsWith('plant')) return 'plant';
  if (resolved.id.startsWith('light')) return 'growLight';
  if (resolved.id.includes('exhaust')) return 'exhaustFan';
  if (resolved.id.includes('circulation')) return 'circulationFan';
  if (resolved.id.startsWith('sensor')) return 'sensor';
  if (resolved.id.startsWith('camera')) return 'camera';
  if (resolved.id.includes('pump')) return 'pump';
  if (resolved.id.includes('tank')) return 'tank';
  if (resolved.id.startsWith('qbx')) return 'hub';
  return 'circulationFan';
}

export function registerGlbAsset(id: VisualAssetId, glbUrl: string): void {
  const spatial = spatialAssetById(LEGACY_TO_SPATIAL[id] ?? id);
  if (spatial) {
    spatial.glbUrl = glbUrl;
    spatial.renderType = 'model';
  }
}

export { resolveSpatialAsset };
export { spatialAssetById } from '../../features/map3d/registry/spatial-asset-registry';
