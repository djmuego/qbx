import type { MapPlacement } from '../../domain/map/space-map.types';
import type { SpaceDimensions } from '../../domain/space/space.types';
import { createPlacement } from '../../domain/map/space-map.geometry';

export interface LayoutStrategy {
  id: 'grid' | 'rack' | 'ai';
  placePlants(input: {
    count: number;
    dimensions: SpaceDimensions;
    spaceId: string;
    parentId?: string;
    growMethod?: string;
  }): MapPlacement[];
}

export function gridShape(count: number, lengthM: number, widthM: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  let cols = Math.ceil(Math.sqrt(count));
  let rows = Math.ceil(count / cols);
  if (lengthM >= widthM && cols < rows) {
    const t = cols;
    cols = rows;
    rows = t;
  }
  if (widthM > lengthM && rows < cols) {
    const t = cols;
    cols = rows;
    rows = t;
  }
  return { cols, rows };
}

export const GridLayoutStrategy: LayoutStrategy = {
  id: 'grid',
  placePlants({ count, dimensions, parentId }) {
    const { cols, rows } = gridShape(count, dimensions.lengthM, dimensions.widthM);
    const marginX = Math.min(0.16, dimensions.lengthM * 0.12);
    const marginY = Math.min(0.16, dimensions.widthM * 0.12);
    const usableW = Math.max(0.2, dimensions.lengthM - 2 * marginX);
    const usableH = Math.max(0.2, dimensions.widthM - 2 * marginY);
    const cellW = usableW / cols;
    const cellH = usableH / rows;
    const pot = Math.max(0.12, Math.min(0.28, cellW * 0.55, cellH * 0.55));
    const placements: MapPlacement[] = [];
    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      placements.push(
        createPlacement({
          id: `plc-plant-${i + 1}`,
          kind: 'plant',
          xM: Number((marginX + col * cellW + (cellW - pot) / 2).toFixed(3)),
          yM: Number((marginY + row * cellH + (cellH - pot) / 2).toFixed(3)),
          zM: 0,
          widthM: pot,
          heightM: pot,
          sizeZM: 0.45,
          canopyDiameterM: pot,
          plantHeightM: 0.45,
          zSource: 'default_visualization',
          mounting: 'floor',
          parentId,
          label: `Растение #${i + 1}`,
        }),
      );
    }
    return placements;
  },
};

export const RackLayoutStrategy: LayoutStrategy = {
  id: 'rack',
  placePlants({ count, dimensions, parentId }) {
    const levels = 3;
    const perLevel = Math.ceil(count / levels);
    const { cols } = gridShape(perLevel, dimensions.lengthM, Math.max(0.4, dimensions.widthM));
    const marginX = 0.12;
    const usableW = dimensions.lengthM - 2 * marginX;
    const cellW = usableW / Math.max(cols, 1);
    const pot = Math.min(0.22, cellW * 0.6);
    const levelH = Math.max(0.45, (dimensions.heightM - 0.4) / levels);
    const placements: MapPlacement[] = [];
    for (let i = 0; i < count; i += 1) {
      const level = Math.floor(i / perLevel);
      const indexOnLevel = i % perLevel;
      const col = indexOnLevel % cols;
      placements.push(
        createPlacement({
          id: `plc-plant-${i + 1}`,
          kind: 'plant',
          xM: Number((marginX + col * cellW + (cellW - pot) / 2).toFixed(3)),
          yM: Number((dimensions.widthM * 0.5 - pot / 2).toFixed(3)),
          zM: Number((0.12 + level * levelH).toFixed(3)),
          widthM: pot,
          heightM: pot,
          sizeZM: Math.min(0.35, levelH - 0.12),
          rackLevel: level + 1,
          parentId,
          zSource: 'default_visualization',
          mounting: 'rack_level',
          label: `Растение #${i + 1}`,
        }),
      );
    }
    return placements;
  },
};

/** Future: LLM proposes LayoutProposal; never auto-applies. */
export const AiLayoutStrategy: LayoutStrategy = {
  id: 'ai',
  placePlants(input) {
    return GridLayoutStrategy.placePlants(input);
  },
};
