import type { MapPlacement } from './space-map.types';
import { createPlacement } from './space-map.geometry';
import type { PlantMedium } from '../grow/plant.types';

export interface BedSpec {
  lengthM: number;
  widthM: number;
  heightM?: number;
  orientationDeg?: number;
  medium?: PlantMedium;
  cropProfileId?: string;
  growRunId?: string;
  zoneId?: string;
  label?: string;
  raised?: boolean;
}

export interface BedGridSpec {
  rows: number;
  cols: number;
  bed: BedSpec;
  gapM?: number;
  originXM?: number;
  originYM?: number;
}

export interface PlantRowSpec {
  startXM: number;
  startYM: number;
  endXM: number;
  endYM: number;
  spacingM: number;
  plantCount?: number;
  cropProfileId?: string;
  growRunId?: string;
  label?: string;
}

export interface PathSpec {
  xM: number;
  yM: number;
  lengthM: number;
  widthM: number;
  orientationDeg?: number;
  material?: 'gravel' | 'concrete' | 'soil' | 'wood' | 'custom';
  label?: string;
}

export interface OrchardSpec {
  rows: number;
  treesPerRow: number;
  rowSpacingM: number;
  treeSpacingM: number;
  originXM?: number;
  originYM?: number;
  labelPrefix?: string;
}

let bedSeq = 0;
let rowSeq = 0;
let pathSeq = 0;

function nextBedId() {
  bedSeq += 1;
  return `plc-bed-${bedSeq}`;
}

function nextRowId() {
  rowSeq += 1;
  return `plc-row-${rowSeq}`;
}

function nextPathId() {
  pathSeq += 1;
  return `plc-path-${pathSeq}`;
}

export function createBedPlacement(spec: BedSpec, id?: string): MapPlacement {
  return createPlacement({
    id: id ?? nextBedId(),
    kind: 'structure',
    role: 'grow_bed',
    xM: 0,
    yM: 0,
    widthM: spec.lengthM,
    heightM: spec.widthM,
    sizeZM: spec.heightM ?? (spec.raised ? 0.35 : 0.08),
    rotationDeg: spec.orientationDeg ?? 0,
    zoneId: spec.zoneId,
    label: spec.label,
    notes: spec.medium ? `medium:${spec.medium}` : undefined,
    mounting: 'floor',
    catalogId: 'grow-bed',
  });
}

export function generateSingleBed(spec: BedSpec, xM: number, yM: number): MapPlacement {
  const bed = createBedPlacement(spec);
  return { ...bed, xM, yM };
}

export function generateParallelBeds(
  count: number,
  spec: BedSpec,
  gapM: number,
  originXM = 1,
  originYM = 1,
): MapPlacement[] {
  const beds: MapPlacement[] = [];
  for (let i = 0; i < count; i += 1) {
    beds.push(
      generateSingleBed(
        { ...spec, label: spec.label ?? `Грядка ${i + 1}` },
        originXM,
        originYM + i * (spec.widthM + gapM),
      ),
    );
  }
  return beds;
}

export function generateGridBeds(spec: BedGridSpec): MapPlacement[] {
  const gap = spec.gapM ?? 0.8;
  const ox = spec.originXM ?? 1;
  const oy = spec.originYM ?? 1;
  const beds: MapPlacement[] = [];
  let n = 0;
  for (let r = 0; r < spec.rows; r += 1) {
    for (let c = 0; c < spec.cols; c += 1) {
      n += 1;
      beds.push(
        generateSingleBed(
          { ...spec.bed, label: spec.bed.label ?? `Грядка ${n}` },
          ox + c * (spec.bed.lengthM + gap),
          oy + r * (spec.bed.widthM + gap),
        ),
      );
    }
  }
  return beds;
}

export function generatePlantRow(spec: PlantRowSpec, id?: string): MapPlacement {
  const dx = spec.endXM - spec.startXM;
  const dy = spec.endYM - spec.startYM;
  const len = Math.hypot(dx, dy);
  const spacing = spec.spacingM > 0 ? spec.spacingM : 0.5;
  const count = spec.plantCount ?? Math.max(1, Math.floor(len / spacing) + 1);
  return createPlacement({
    id: id ?? nextRowId(),
    kind: 'plant_group',
    role: 'row',
    xM: Math.min(spec.startXM, spec.endXM),
    yM: Math.min(spec.startYM, spec.endYM),
    widthM: Math.max(Math.abs(dx), spacing),
    heightM: Math.max(Math.abs(dy), 0.4),
    sizeZM: 0.45,
    rotationDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    spacingXM: spacing,
    groupCols: count,
    groupRows: 1,
    label: spec.label ?? 'Ряд',
    mounting: 'floor',
    catalogId: 'plant-row',
  });
}

export function generateLinearPath(spec: PathSpec, id?: string): MapPlacement {
  return createPlacement({
    id: id ?? nextPathId(),
    kind: 'structure',
    role: 'path',
    xM: spec.xM,
    yM: spec.yM,
    widthM: spec.orientationDeg === 90 ? spec.widthM : spec.lengthM,
    heightM: spec.orientationDeg === 90 ? spec.lengthM : spec.widthM,
    sizeZM: 0.03,
    rotationDeg: spec.orientationDeg ?? 0,
    label: spec.label ?? 'Дорожка',
    notes: spec.material ? `pathMaterial:${spec.material}` : undefined,
    mounting: 'floor',
    catalogId: 'path',
  });
}

export function generateOrchardRows(spec: OrchardSpec): MapPlacement[] {
  const ox = spec.originXM ?? 2;
  const oy = spec.originYM ?? 2;
  const rows: MapPlacement[] = [];
  for (let r = 0; r < spec.rows; r += 1) {
    const y = oy + r * spec.rowSpacingM;
    rows.push(
      generatePlantRow({
        startXM: ox,
        startYM: y,
        endXM: ox + (spec.treesPerRow - 1) * spec.treeSpacingM,
        endYM: y,
        spacingM: spec.treeSpacingM,
        plantCount: spec.treesPerRow,
        label: `${spec.labelPrefix ?? 'Ряд'} ${r + 1}`,
      }),
    );
  }
  return rows;
}

/** Reset internal id counters — for deterministic tests. */
export function resetSiteLayoutSeq() {
  bedSeq = 0;
  rowSeq = 0;
  pathSeq = 0;
}
