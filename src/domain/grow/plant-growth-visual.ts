import type { GrowPhaseId } from './grow-phase.types';
import type { Plant } from './plant.types';
import type { MapPlacement } from '../map/space-map.types';

/** Visual growth stage used for sprites, emoji, and scale curves. */
export type PlantVisualStage = 'germination' | 'seedling' | 'vegetative' | 'flowering' | 'mature';

/** Human-readable labels for 9 visual sprite stages (sheet row-major). */
export const VISUAL_STAGE_LABELS: readonly string[] = [
  'Прорастание',
  'Ранний саженец',
  'Саженец',
  'Ранняя вегетация',
  'Вегетация',
  'Поздняя вегетация',
  'Раннее цветение',
  'Цветение',
  'Зрелость',
];

export interface PlantGrowthVisual {
  ageDays: number;
  stage: PlantVisualStage;
  /** 1..9 — sprite stage index from growth sheet */
  visualStageIndex: number;
  /** 0..1 progress within current visual stage (texture holds until threshold) */
  visualStageProgress: number;
  /** 0..1 — footprint scale relative to mature placement size */
  scale: number;
  /** 0..1 — vertical scale for 3D canopy height */
  heightScale: number;
  emoji: string;
  /** Meters — display canopy diameter for 2D circle */
  canopyDiameterM: number;
  /** Meters — display plant height */
  plantHeightM: number;
  growthMode: 'auto' | 'manual';
  /** True when age comes from timeline scrubber, not live clock */
  isPreview?: boolean;
  /** Full cycle length for this placement */
  cycleDays?: number;
}

export interface PlantGrowthOptions {
  growPhase?: GrowPhaseId;
  cropStartedAt?: string;
  groupPlants?: Plant[];
  now?: Date;
  /** Override age for cycle preview / scrubber — visual only */
  previewAgeDays?: number;
}

const STAGE_EMOJI: Record<PlantVisualStage, string> = {
  germination: '🌱',
  seedling: '🌱',
  vegetative: '🪴',
  flowering: '🌿',
  mature: '🌳',
};

const PHASE_MIN_SCALE: Record<GrowPhaseId, number> = {
  seedling: 0.14,
  vegetation: 0.42,
  flowering: 0.72,
  flushing: 0.9,
};

const DEFAULT_CYCLE_DAYS = 90;
const TREE_CYCLE_DAYS = 365;
const CROP_ROW_CYCLE_DAYS = 55;

function parseDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function plantAgeDays(plantedAt?: string, fallbackAt?: string, now: Date = new Date()): number {
  const start = parseDate(plantedAt) ?? parseDate(fallbackAt);
  if (!start) return 0;
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function cycleDaysForPlacement(placement: Pick<MapPlacement, 'kind' | 'role'>): number {
  const role = (placement.role ?? '').toLowerCase();
  if (role.includes('tree') || role.includes('orchard')) return TREE_CYCLE_DAYS;
  if (role.includes('crop') || role.includes('row')) return CROP_ROW_CYCLE_DAYS;
  if (placement.kind === 'plant_group') return CROP_ROW_CYCLE_DAYS;
  return DEFAULT_CYCLE_DAYS;
}

export function placementCycleDays(placement: Pick<MapPlacement, 'kind' | 'role'>): number {
  return cycleDaysForPlacement(placement);
}

export function cycleMonthFromDay(day: number): number {
  return Math.floor(Math.max(0, day) / 30) + 1;
}

export function cycleMonthsTotal(cycleDays: number): number {
  return Math.max(1, Math.ceil(cycleDays / 30));
}

export function formatGrowthTimelineLabel(day: number, cycleDays: number): string {
  const month = cycleMonthFromDay(day);
  const total = cycleMonthsTotal(cycleDays);
  return `Месяц ${month}/${total}`;
}

/** Smooth S-curve: slow start, fast mid, plateau near maturity. */
export function growthScaleFromAge(ageDays: number, cycleDays: number): number {
  const t = Math.min(1, Math.max(0, ageDays / Math.max(cycleDays, 1)));
  const eased = (1 - Math.exp(-4.2 * t)) / (1 - Math.exp(-4.2));
  return 0.06 + eased * 0.94;
}

export function stageFromScale(scale: number): PlantVisualStage {
  if (scale < 0.14) return 'germination';
  if (scale < 0.32) return 'seedling';
  if (scale < 0.68) return 'vegetative';
  if (scale < 0.9) return 'flowering';
  return 'mature';
}

/** Map continuous scale to 9 sprite stages. Texture holds until index advances. */
export function visualStageFromScale(scale: number): { visualStageIndex: number; visualStageProgress: number } {
  const t = Math.min(1, Math.max(0, (scale - 0.06) / 0.94));
  const floatIdx = t * 8;
  const visualStageIndex = Math.min(9, Math.floor(floatIdx) + 1);
  const visualStageProgress = floatIdx - Math.floor(floatIdx);
  return { visualStageIndex, visualStageProgress };
}

export function plantStageAssetId(visualStageIndex: number): string {
  const clamped = Math.min(9, Math.max(1, Math.round(visualStageIndex)));
  return `plant.stage.${String(clamped).padStart(2, '0')}`;
}

export function visualStageLabel(index: number): string {
  return VISUAL_STAGE_LABELS[Math.min(9, Math.max(1, index)) - 1] ?? VISUAL_STAGE_LABELS[4];
}

export function resolvePlantGrowthVisual(
  ageDays: number,
  cycleDays: number,
  growPhase?: GrowPhaseId,
  manual?: { canopyDiameterM?: number; plantHeightM?: number; matureWidthM?: number; matureHeightM?: number; matureSizeZM?: number },
  options?: { isPreview?: boolean },
): PlantGrowthVisual {
  let scale = growthScaleFromAge(ageDays, cycleDays);
  if (!options?.isPreview && growPhase && ageDays === 0) {
    scale = Math.max(scale, PHASE_MIN_SCALE[growPhase]);
  } else if (!options?.isPreview && growPhase) {
    scale = Math.max(scale, PHASE_MIN_SCALE[growPhase] * 0.85);
  }

  const growthMode = manual?.canopyDiameterM != null || manual?.plantHeightM != null ? 'manual' : 'auto';
  if (growthMode === 'manual' && manual?.canopyDiameterM != null && manual.matureWidthM) {
    scale = Math.min(1, Math.max(0.06, manual.canopyDiameterM / manual.matureWidthM));
  }

  scale = Math.min(1, scale);
  const stage = stageFromScale(scale);
  const { visualStageIndex, visualStageProgress } = visualStageFromScale(scale);
  const heightScale = manual?.plantHeightM != null && manual.matureSizeZM
    ? Math.min(1, manual.plantHeightM / manual.matureSizeZM)
    : Math.min(1, scale * 1.08);
  const canopyDiameterM = manual?.canopyDiameterM ?? (manual?.matureWidthM ?? 0.3) * scale;
  const plantHeightM = manual?.plantHeightM ?? (manual?.matureSizeZM ?? 0.45) * heightScale;
  return {
    ageDays,
    stage,
    visualStageIndex,
    visualStageProgress,
    scale,
    heightScale,
    emoji: STAGE_EMOJI[stage],
    canopyDiameterM,
    plantHeightM,
    growthMode,
    isPreview: options?.isPreview,
    cycleDays,
  };
}

export function resolvePlacementGrowthVisual(
  placement: MapPlacement,
  plant: Plant | null | undefined,
  options: PlantGrowthOptions = {},
): PlantGrowthVisual | null {
  if (placement.kind !== 'plant' && placement.kind !== 'plant_group') return null;

  const cycleDays = cycleDaysForPlacement(placement);
  const now = options.now ?? new Date();
  const isPreview = options.previewAgeDays != null;

  let ageDays: number;
  if (isPreview) {
    ageDays = Math.max(0, Math.round(options.previewAgeDays!));
  } else if (placement.kind === 'plant_group' && options.groupPlants?.length) {
    const ages = options.groupPlants.map((p) =>
      plantAgeDays(p.plantedAt, options.cropStartedAt, now),
    );
    ageDays = Math.round(ages.reduce((sum, d) => sum + d, 0) / ages.length);
  } else {
    ageDays = plantAgeDays(plant?.plantedAt, options.cropStartedAt, now);
  }

  const manual =
    !isPreview && plant?.growthMode === 'manual'
      ? {
          canopyDiameterM: plant.canopyDiameterM,
          plantHeightM: plant.plantHeightM,
          matureWidthM: placement.widthM,
          matureHeightM: placement.heightM,
          matureSizeZM: placement.sizeZM ?? (placement.kind === 'plant_group' ? 0.5 : 0.45),
        }
      : {
          matureWidthM: placement.widthM,
          matureHeightM: placement.heightM,
          matureSizeZM: placement.sizeZM ?? (placement.kind === 'plant_group' ? 0.5 : 0.45),
        };

  return resolvePlantGrowthVisual(ageDays, cycleDays, isPreview ? undefined : options.growPhase, manual, { isPreview });
}

export interface GrowthDisplayBounds {
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  sizeZM: number;
}

/** Circular canopy footprint for 2D planner. */
export function growthCanopyBounds(
  placement: MapPlacement,
  growth: PlantGrowthVisual,
): GrowthDisplayBounds {
  const matureW = placement.widthM;
  const matureH = placement.heightM;
  const matureZ = placement.sizeZM ?? (placement.kind === 'plant_group' ? 0.5 : 0.45);
  const diameter =
    growth.growthMode === 'manual'
      ? Math.max(0.08, Math.min(growth.canopyDiameterM, Math.max(matureW, matureH)))
      : Math.max(0.08, Math.max(matureW, matureH) * growth.scale);
  const widthM = diameter;
  const heightM = diameter;
  const sizeZM = Math.max(0.1, growth.plantHeightM);
  return {
    xM: placement.xM + (matureW - widthM) / 2,
    yM: placement.yM + (matureH - heightM) / 2,
    widthM,
    heightM,
    sizeZM,
  };
}

/** Display footprint centered inside the mature placement slot. */
export function growthDisplayBounds(
  placement: MapPlacement,
  growth: PlantGrowthVisual,
): GrowthDisplayBounds {
  if (placement.kind === 'plant') {
    return growthCanopyBounds(placement, growth);
  }
  const matureW = placement.widthM;
  const matureH = placement.heightM;
  const matureZ = placement.sizeZM ?? (placement.kind === 'plant_group' ? 0.5 : 0.45);
  const widthM = Math.max(0.08, matureW * growth.scale);
  const heightM = Math.max(0.08, matureH * growth.scale);
  const sizeZM = Math.max(0.1, matureZ * growth.heightScale);
  return {
    xM: placement.xM + (matureW - widthM) / 2,
    yM: placement.yM + (matureH - heightM) / 2,
    widthM,
    heightM,
    sizeZM,
  };
}

export function placementForGrowthRender(
  placement: MapPlacement,
  growth: PlantGrowthVisual,
): MapPlacement {
  const bounds = growthDisplayBounds(placement, growth);
  return {
    ...placement,
    xM: bounds.xM,
    yM: bounds.yM,
    widthM: bounds.widthM,
    heightM: bounds.heightM,
    sizeZM: bounds.sizeZM,
    canopyDiameterM: bounds.widthM * 0.9,
    plantHeightM: bounds.sizeZM,
  };
}

export function growPhaseForAsset(stage: PlantVisualStage): GrowPhaseId {
  switch (stage) {
    case 'germination':
    case 'seedling':
      return 'seedling';
    case 'vegetative':
      return 'vegetation';
    case 'flowering':
      return 'flowering';
    case 'mature':
      return 'flushing';
    default:
      return 'vegetation';
  }
}
