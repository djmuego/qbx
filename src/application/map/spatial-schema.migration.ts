import type { SpaceMap } from '../../domain/map/space-map.types';
import type { SpaceDimensions } from '../../domain/space/space.types';
import { isOutdoorPreset } from '../../domain/map/environment.types';
import type { TerrainProfile } from '../../domain/map/terrain.types';
import { defaultTerrainForPreset } from '../../domain/map/terrain.types';
import { migrateMapTo3D } from './spatial-migration';

export const CURRENT_SPATIAL_SCHEMA_VERSION = 3 as const;

export function migrateSpatialSchema(map: SpaceMap, room: SpaceDimensions): SpaceMap {
  const withHeights = migrateMapTo3D(map, room);
  const preset = withHeights.environmentPreset;
  const terrainProfile: TerrainProfile | undefined =
    withHeights.terrainProfile ??
    (preset && isOutdoorPreset(preset) ? defaultTerrainForPreset(preset) : undefined);
  return {
    ...withHeights,
    spatialSchemaVersion: CURRENT_SPATIAL_SCHEMA_VERSION,
    relationships: withHeights.relationships ?? [],
    zones: withHeights.zones.map((z) => ({ ...z, type: z.type ?? 'custom' })),
    terrainProfile,
    northOffsetDeg: withHeights.northOffsetDeg ?? 0,
  };
}
