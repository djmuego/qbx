import type { EnvironmentMaterialId } from './environment.types';

/** Terrain surface types — geometry only, not agronomy. */
export type TerrainType =
  | 'soil'
  | 'grass'
  | 'mulch'
  | 'gravel'
  | 'concrete'
  | 'sand'
  | 'hydro_floor'
  | 'mixed'
  | 'custom';

export type TerrainElevationMode = 'flat' | 'simpleSlope';

/** Future: heightmap | contours | elevationGrid */
export type TerrainFutureMode = 'heightmap' | 'contours' | 'elevationGrid';

export interface TerrainSlope {
  /** Degrees — gentle site tilt for V1 visualization. */
  angleDeg: number;
  /** Compass direction the slope runs toward (0 = north, clockwise). */
  directionDeg: number;
}

export interface TerrainProfile {
  type: TerrainType;
  elevationMode: TerrainElevationMode;
  /** Material used for terrain plane rendering. */
  materialId: EnvironmentMaterialId;
  slope?: TerrainSlope;
  notes?: string;
}

export const DEFAULT_TERRAIN_PROFILE: TerrainProfile = {
  type: 'soil',
  elevationMode: 'flat',
  materialId: 'naturalSoil',
};

export function terrainMaterialForType(type: TerrainType): EnvironmentMaterialId {
  switch (type) {
    case 'grass':
      return 'grass';
    case 'mulch':
      return 'mulch';
    case 'gravel':
      return 'gravel';
    case 'concrete':
      return 'concreteOutdoor';
    case 'sand':
      return 'sand';
    case 'hydro_floor':
      return 'hydroFloor';
    case 'mixed':
      return 'naturalSoil';
    default:
      return 'naturalSoil';
  }
}

export function defaultTerrainForPreset(preset: string): TerrainProfile {
  switch (preset) {
    case 'OUTDOOR_GARDEN':
    case 'NURSERY':
      return { type: 'grass', elevationMode: 'flat', materialId: 'grass' };
    case 'OPEN_FIELD':
    case 'ORCHARD':
      return { type: 'soil', elevationMode: 'flat', materialId: 'naturalSoil' };
    case 'SMALL_FARM':
    case 'GREENHOUSE_SITE':
      return { type: 'mixed', elevationMode: 'flat', materialId: 'grass' };
  }
  return DEFAULT_TERRAIN_PROFILE;
}
