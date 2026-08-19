import type { MapPlacement } from '../../../domain/map/space-map.types';
import type { GrowPhaseId } from '../../../domain/grow/grow-phase.types';
import type { Plant } from '../../../domain/grow/plant.types';
import type { SpatialAssetDescriptor } from '../../../domain/map/visual-assets.types';
import type { PlantGrowthVisual } from '../../../domain/grow/plant-growth-visual';
import { plantStageAssetId } from '../../../domain/grow/plant-growth-visual';
import { spatialAssetById } from '../registry/spatial-asset-registry';

export interface ResolveSpatialAssetContext {
  growPhase?: GrowPhaseId;
  plant?: Plant | null;
  growthVisual?: PlantGrowthVisual | null;
  cropStartedAt?: string;
  previewAgeDays?: number;
}

const PROCEDURAL_FALLBACK: SpatialAssetDescriptor = {
  id: 'fallback.procedural',
  category: 'misc',
  renderType: 'procedural',
  defaultScale: { widthM: 0.2, heightM: 0.2, depthM: 0.2 },
  defaultHeightM: 0.2,
  anchor: 'center',
  billboard: 'fixed-orientation',
  mobileLod: 'procedural',
  objectSprite: false,
};

function spriteOrFallback(id: string): SpatialAssetDescriptor {
  const asset = spatialAssetById(id);
  if (!asset) return PROCEDURAL_FALLBACK;
  if (asset.renderType === 'sprite' && !asset.source && !asset.glbUrl) return { ...asset, renderType: 'procedural' };
  if (asset.renderType === 'model' && !asset.glbUrl) return { ...asset, renderType: 'procedural' };
  return asset;
}

export function resolveSpatialAsset(
  placement: Pick<MapPlacement, 'kind' | 'widthM'> & Partial<Pick<MapPlacement, 'role' | 'catalogId' | 'sizeZM'>>,
  ctx: ResolveSpatialAssetContext = {},
): SpatialAssetDescriptor {
  const role = (placement.role ?? placement.catalogId ?? '').toLowerCase();
  const kind = placement.kind;

  if (kind === 'plant' || kind === 'plant_group') {
    if (ctx.plant?.medium === 'hydro') return spriteOrFallback('plant.hydro');
    const stageIdx = ctx.growthVisual?.visualStageIndex ?? 5;
    return spriteOrFallback(plantStageAssetId(stageIdx));
  }

  if (kind === 'light') {
    if (role.includes('bar') || role.includes('led_bar')) return spriteOrFallback('light.bar');
    return spriteOrFallback('light.panel');
  }

  if (kind === 'equipment' || role === 'exhaust' || role === 'circulation' || role === 'intake') {
    if (role === 'exhaust' || role.includes('exhaust')) return spriteOrFallback('climate.exhaust');
    if (role === 'intake' || role.includes('filter') || role.includes('carbon')) return spriteOrFallback('climate.filter');
    if (role === 'humidifier') return spriteOrFallback('climate.humidifier');
    if (role === 'heater') return spriteOrFallback('climate.heater');
    if (role === 'circulation') return spriteOrFallback('climate.circulation');
    if (kind === 'equipment') return spriteOrFallback('climate.exhaust');
  }

  if (kind === 'sensor') return spriteOrFallback('sensor.environment');
  if (kind === 'camera') return spriteOrFallback('camera.generic');
  if (kind === 'hub') return spriteOrFallback('qbx.controller');
  if (kind === 'irrigation') {
    if (role === 'pump') return spriteOrFallback('irrigation.pump');
    if (role === 'nutrients') return spriteOrFallback('irrigation.nutrients');
    return spriteOrFallback('irrigation.tank');
  }
  if (kind === 'outlet') return spriteOrFallback('electrical.socket');
  if (kind === 'electrical_panel') return spriteOrFallback('electrical.panel');
  if (kind === 'structure') {
    if (role === 'rack' || role === 'grow_rack') return spriteOrFallback('infrastructure.rack');
    if (role === 'grow_bed' || role === 'tray' || role === 'bed') return spriteOrFallback('infrastructure.grow-bed');
    if (role === 'table') return spriteOrFallback('infrastructure.table');
    if (role === 'shelf') return spriteOrFallback('infrastructure.shelf');
    if (role === 'tent' || role === 'grow_tent') return spriteOrFallback('infrastructure.grow-tent');
  }

  return PROCEDURAL_FALLBACK;
}

/** Contain-fit sprite dimensions preserving aspect ratio within placement bounds. */
export function spriteVisualSize(
  placement: Pick<MapPlacement, 'widthM'> & Partial<Pick<MapPlacement, 'heightM' | 'sizeZM' | 'kind' | 'canopyDiameterM' | 'plantHeightM'>>,
  asset: SpatialAssetDescriptor,
  growth?: PlantGrowthVisual | null,
): { widthM: number; heightM: number } {
  const aspect = asset.aspectRatio ?? asset.defaultScale.widthM / Math.max(asset.defaultScale.heightM, 0.01);

  if (asset.category === 'plants' && growth) {
    const canopy = Math.max(0.08, growth.canopyDiameterM);
    const height = Math.max(0.1, growth.plantHeightM);
    const plantAspect = canopy / height;
    if (plantAspect > aspect) {
      return { widthM: canopy, heightM: canopy / aspect };
    }
    return { widthM: height * aspect, heightM: height };
  }

  let boxW = Math.max(placement.widthM || asset.defaultScale.widthM, 0.06);
  let boxH = placement.sizeZM ?? placement.heightM ?? asset.defaultHeightM;
  if (boxH < asset.defaultHeightM * 0.45) boxH = asset.defaultHeightM;

  if (asset.category === 'sensors') {
    boxW = Math.min(0.16, Math.max(0.08, boxW));
    boxH = Math.min(0.16, Math.max(0.08, boxH));
  }

  const boxAspect = boxW / Math.max(boxH, 0.01);
  if (boxAspect > aspect) {
    return { widthM: boxH * aspect, heightM: boxH };
  }
  return { widthM: boxW, heightM: boxW / aspect };
}

export function preloadPlantStageUrls(currentIndex: number): string[] {
  const indices = [currentIndex, Math.min(9, currentIndex + 1)];
  return indices.map((i) => {
    const asset = spatialAssetById(plantStageAssetId(i));
    return asset?.source ?? '';
  }).filter(Boolean);
}

export { PROCEDURAL_FALLBACK };
