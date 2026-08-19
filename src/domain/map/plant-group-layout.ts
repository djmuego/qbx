import type { MapPlacement } from './space-map.types';

export interface PlantGroupInstance {
  col: number;
  row: number;
  localXM: number;
  localYM: number;
}

/** Offsets inside a plant_group footprint. One logical entity, N visual instances. */
export function generatePlantGroupInstances(group: Pick<MapPlacement, 'groupRows' | 'groupCols' | 'spacingXM' | 'spacingYM' | 'widthM' | 'heightM'>): PlantGroupInstance[] {
  const rows = Math.max(1, Math.floor(group.groupRows ?? 1));
  const cols = Math.max(1, Math.floor(group.groupCols ?? 1));
  const sx = group.spacingXM ?? (group.widthM / Math.max(cols, 1));
  const sy = group.spacingYM ?? (group.heightM / Math.max(rows, 1));
  const instances: PlantGroupInstance[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      instances.push({
        col,
        row,
        localXM: col * sx,
        localYM: row * sy,
      });
    }
  }
  return instances;
}

export function plantGroupFootprintM(rows: number, cols: number, spacingXM: number, spacingYM: number, potM = 0.3) {
  return {
    widthM: Number(((cols - 1) * spacingXM + potM).toFixed(3)),
    heightM: Number(((rows - 1) * spacingYM + potM).toFixed(3)),
  };
}
