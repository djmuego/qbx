import type { EnvironmentMaterialId } from '../../domain/map/environment.types';

export interface MaterialSpec {
  id: EnvironmentMaterialId;
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  opacity?: number;
}

export const MATERIAL_REGISTRY: Record<EnvironmentMaterialId, MaterialSpec> = {
  growTentFabric: { id: 'growTentFabric', color: '#1c1917', roughness: 0.92, metalness: 0 },
  reflectiveMylar: { id: 'reflectiveMylar', color: '#e2e8f0', roughness: 0.12, metalness: 0.78 },
  growRoomWall: { id: 'growRoomWall', color: '#f5f5f4', roughness: 0.88, metalness: 0 },
  concreteFloor: { id: 'concreteFloor', color: '#d6d3d1', roughness: 0.9, metalness: 0.04 },
  hydroFloor: { id: 'hydroFloor', color: '#cbd5e1', roughness: 0.45, metalness: 0.15 },
  metalRack: { id: 'metalRack', color: '#a8a29e', roughness: 0.32, metalness: 0.82 },
  plastic: { id: 'plastic', color: '#78716c', roughness: 0.55, metalness: 0.05 },
  glass: { id: 'glass', color: '#a5f3fc', roughness: 0.08, metalness: 0.04, opacity: 0.28 },
  greenhouseGlass: { id: 'greenhouseGlass', color: '#99f6e4', roughness: 0.1, metalness: 0.05, opacity: 0.32 },
  soil: { id: 'soil', color: '#57534e', roughness: 0.96, metalness: 0 },
  coco: { id: 'coco', color: '#92400e', roughness: 0.94, metalness: 0 },
  water: { id: 'water', color: '#38bdf8', roughness: 0.08, metalness: 0.1, opacity: 0.45 },
  wood: { id: 'wood', color: '#a16207', roughness: 0.82, metalness: 0 },
  rubber: { id: 'rubber', color: '#292524', roughness: 0.95, metalness: 0 },
  qbxBlack: { id: 'qbxBlack', color: '#18181b', roughness: 0.55, metalness: 0.2 },
  qbxGreen: { id: 'qbxGreen', color: '#16a34a', roughness: 0.45, metalness: 0.1, emissive: '#166534' },
  floor_concrete: { id: 'floor_concrete', color: '#e7e5e4', roughness: 0.92, metalness: 0.02 },
  floor_soil: { id: 'floor_soil', color: '#57534e', roughness: 0.95, metalness: 0 },
  wall_drywall: { id: 'wall_drywall', color: '#f5f5f4', roughness: 0.88, metalness: 0 },
  wall_mylar: { id: 'wall_mylar', color: '#e2e8f0', roughness: 0.18, metalness: 0.72 },
  tent_canvas: { id: 'tent_canvas', color: '#1c1917', roughness: 0.85, metalness: 0 },
  glass_panel: { id: 'glass_panel', color: '#a7f3d0', roughness: 0.12, metalness: 0.05, opacity: 0.3 },
  metal_frame: { id: 'metal_frame', color: '#a8a29e', roughness: 0.35, metalness: 0.8 },
  ceiling_white: { id: 'ceiling_white', color: '#fafafa', roughness: 0.8, metalness: 0 },
  naturalSoil: { id: 'naturalSoil', color: '#57534e', roughness: 0.96, metalness: 0 },
  wetSoil: { id: 'wetSoil', color: '#44403c', roughness: 0.92, metalness: 0 },
  drySoil: { id: 'drySoil', color: '#a8a29e', roughness: 0.98, metalness: 0 },
  grass: { id: 'grass', color: '#4d7c0f', roughness: 0.9, metalness: 0 },
  mulch: { id: 'mulch', color: '#78350f', roughness: 0.95, metalness: 0 },
  gravel: { id: 'gravel', color: '#a8a29e', roughness: 0.88, metalness: 0.05 },
  sand: { id: 'sand', color: '#d6d3d1', roughness: 0.94, metalness: 0 },
  concreteOutdoor: { id: 'concreteOutdoor', color: '#d4d4d8', roughness: 0.85, metalness: 0.04 },
  woodOutdoor: { id: 'woodOutdoor', color: '#92400e', roughness: 0.82, metalness: 0 },
  greenhousePath: { id: 'greenhousePath', color: '#a3a3a3', roughness: 0.75, metalness: 0.1 },
  irrigationPlastic: { id: 'irrigationPlastic', color: '#1e3a5f', roughness: 0.5, metalness: 0.15 },
  metalOutdoor: { id: 'metalOutdoor', color: '#78716c', roughness: 0.35, metalness: 0.75 },
  waterSurface: { id: 'waterSurface', color: '#0ea5e9', roughness: 0.1, metalness: 0.08, opacity: 0.55 },
  shadeNet: { id: 'shadeNet', color: '#374151', roughness: 0.7, metalness: 0.05, opacity: 0.45 },
};

export function materialSpec(id: EnvironmentMaterialId): MaterialSpec {
  return MATERIAL_REGISTRY[id];
}
