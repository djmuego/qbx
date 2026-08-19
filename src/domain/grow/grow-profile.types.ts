import type { CropProfile, GrowMedium } from './crop-profile.types';
import type { GrowStageId } from './grow-stage.types';
import type { GrowTargets } from './grow-targets.types';

/** Unified grow recipe / blueprint profile — extensible catalog, not hardcoded truth */
export interface GrowProfile {
  id: string;
  cropId: string;
  commonName: string;
  cultivar?: string;
  medium?: GrowMedium;
  phase: GrowStageId;
  /** Day of cycle if known */
  dayOfCycle?: number;
  plantedAt?: string;
  targets: GrowTargets;
  notes?: string;
  source: 'catalog' | 'user' | 'imported';
}

export function growProfileFromCrop(crop: CropProfile, phase: GrowStageId, targets: GrowTargets): GrowProfile {
  return {
    id: `${crop.cropId}-${phase}`,
    cropId: crop.cropId,
    commonName: crop.commonName,
    cultivar: crop.cultivar,
    medium: crop.medium,
    phase,
    plantedAt: crop.startedAt,
    targets,
    notes: crop.notes,
    source: 'user',
  };
}
