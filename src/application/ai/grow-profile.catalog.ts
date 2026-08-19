import type { GrowStageId } from '../../domain/grow/grow-stage.types';
import type { GrowTargets, TargetRange } from '../../domain/grow/grow-targets.types';
import type { GrowProfile } from '../../domain/grow/grow-profile.types';

/** Catalog hints — PROJECT_DECISION, not agronomic absolute truth */
const CROP_VPD_HINTS: Partial<Record<string, Partial<Record<GrowStageId, TargetRange>>>> = {
  tomato: {
    vegetative: { min: 0.8, max: 1.0, unit: 'kPa' },
    flowering: { min: 1.0, max: 1.2, unit: 'kPa' },
    fruiting: { min: 0.9, max: 1.2, unit: 'kPa' },
  },
  cucumber: {
    vegetative: { min: 0.7, max: 1.0, unit: 'kPa' },
    fruiting: { min: 0.9, max: 1.2, unit: 'kPa' },
  },
  'lettuce-leafy': {
    vegetative: { min: 0.6, max: 0.9, unit: 'kPa' },
  },
  basil: {
    vegetative: { min: 0.8, max: 1.1, unit: 'kPa' },
  },
};

export function getVpdTargetForCrop(cropId: string, phase: GrowStageId): TargetRange | undefined {
  const crop = CROP_VPD_HINTS[cropId];
  if (!crop) return undefined;
  return crop[phase] ?? crop.vegetative ?? crop.seedling;
}

export function buildGrowProfileTargets(cropId: string, phase: GrowStageId, base: GrowTargets): GrowTargets {
  const vpd = getVpdTargetForCrop(cropId, phase);
  return {
    ...base,
    vpd: vpd ?? base.vpd,
    source: cropId ? 'crop' : base.source,
  };
}

export function listCatalogProfiles(): Pick<GrowProfile, 'id' | 'cropId' | 'commonName' | 'phase'>[] {
  return [
    { id: 'tomato-vegetative', cropId: 'tomato', commonName: 'Томат', phase: 'vegetative' },
    { id: 'cucumber-vegetative', cropId: 'cucumber', commonName: 'Огурец', phase: 'vegetative' },
    { id: 'lettuce-leafy-vegetative', cropId: 'lettuce-leafy', commonName: 'Салат', phase: 'vegetative' },
    { id: 'basil-vegetative', cropId: 'basil', commonName: 'Базилик', phase: 'vegetative' },
  ];
}
