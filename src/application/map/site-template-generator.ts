import type { LayoutPreview } from '../../domain/map/map-blueprint.types';
import type { EnvironmentPresetId } from '../../domain/map/environment.types';
import { isOutdoorPreset } from '../../domain/map/environment.types';
import type { SpaceDimensions } from '../../domain/space/space.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import {
  clampMapToDimensions,
  createEmptySpaceMap,
  createPlacement,
} from '../../domain/map/space-map.geometry';
import { defaultTerrainForPreset } from '../../domain/map/terrain.types';
import {
  generateGridBeds,
  generateLinearPath,
  generateOrchardRows,
  generateParallelBeds,
  resetSiteLayoutSeq,
} from '../../domain/map/site-layout';
import { generateEnvironment } from './environment-generator';

export interface SiteLayoutInput {
  spaceId: string;
  preset: EnvironmentPresetId;
  dimensions: SpaceDimensions;
  templateId?: string;
  /** Optional child greenhouse space ids for nested navigation. */
  childGreenhouseIds?: string[];
}

export function outdoorGridStepM(dimensions: SpaceDimensions): number {
  const maxDim = Math.max(dimensions.lengthM, dimensions.widthM);
  if (maxDim <= 8) return 0.5;
  if (maxDim <= 25) return 1;
  if (maxDim <= 60) return 2;
  return 5;
}

export function generateSiteLayout(input: SiteLayoutInput): LayoutPreview {
  resetSiteLayoutSeq();
  const { dimensions: d, spaceId, preset } = input;
  const map = createEmptySpaceMap(spaceId);
  map.appliedTemplateId = input.templateId ?? preset.toLowerCase();
  map.heightsAreDefaults = true;
  map.environmentPreset = preset;
  map.gridStepM = outdoorGridStepM(d);
  map.northOffsetDeg = 0;
  map.terrainProfile = defaultTerrainForPreset(preset);
  map.spatialSchemaVersion = 3;

  const add = (placement: Parameters<typeof createPlacement>[0]) => {
    map.placements.push(createPlacement({ ...placement, zSource: 'default_visualization' }));
  };

  if (preset === 'OUTDOOR_GARDEN' || input.templateId === 'small-garden-10') {
    add({
      id: 'plc-bed-1',
      kind: 'structure',
      role: 'grow_bed',
      xM: 2,
      yM: 2,
      widthM: 3,
      heightM: 1.2,
      sizeZM: 0.3,
      label: 'Грядка 1',
      catalogId: 'grow-bed',
    });
    add({
      id: 'plc-bed-2',
      kind: 'structure',
      role: 'grow_bed',
      xM: 6,
      yM: 2,
      widthM: 3,
      heightM: 1.2,
      sizeZM: 0.3,
      label: 'Грядка 2',
      catalogId: 'grow-bed',
    });
    map.placements.push(
      generateLinearPath({ xM: 1, yM: 5, lengthM: 8, widthM: 1.2, material: 'gravel', label: 'Дорожка' }),
    );
  } else if (preset === 'OPEN_FIELD' || input.templateId === 'open-field-rows') {
    map.placements.push(
      ...generateParallelBeds(4, { lengthM: 45, widthM: 1.2, heightM: 0.15, raised: false }, 1.5, 2, 3),
    );
    map.placements.push(
      generateLinearPath({ xM: 1, yM: 1, lengthM: d.lengthM - 2, widthM: 2, material: 'soil', label: 'Проезд' }),
    );
  } else if (preset === 'ORCHARD' || input.templateId === 'orchard-rows') {
    map.placements.push(
      ...generateOrchardRows({
        rows: 5,
        treesPerRow: 8,
        rowSpacingM: 4,
        treeSpacingM: 3,
        originXM: 3,
        originYM: 3,
      }),
    );
  } else if (preset === 'NURSERY' || input.templateId === 'nursery-yard') {
    map.placements.push(
      ...generateGridBeds({
        rows: 2,
        cols: 3,
        gapM: 1,
        originXM: 2,
        originYM: 2,
        bed: { lengthM: 4, widthM: 1.5, heightM: 0.25, raised: true },
      }),
    );
  } else if (preset === 'GREENHOUSE_SITE' || input.templateId === 'greenhouse-outdoor') {
    const ghIds = input.childGreenhouseIds ?? ['gh-a', 'gh-b'];
    add({
      id: 'plc-gh-1',
      kind: 'structure',
      role: 'greenhouse',
      xM: 5,
      yM: 8,
      widthM: 12,
      heightM: 6,
      sizeZM: 3.2,
      label: 'Greenhouse A',
      catalogId: 'greenhouse',
      childSpaceId: ghIds[0],
    });
    add({
      id: 'plc-gh-2',
      kind: 'structure',
      role: 'greenhouse',
      xM: 22,
      yM: 8,
      widthM: 12,
      heightM: 6,
      sizeZM: 3.2,
      label: 'Greenhouse B',
      catalogId: 'greenhouse',
      childSpaceId: ghIds[1],
    });
    map.placements.push(
      ...generateParallelBeds(4, { lengthM: 8, widthM: 1.2, heightM: 0.2 }, 1.2, 5, 22),
    );
    add({
      id: 'plc-tank-1',
      kind: 'irrigation',
      role: 'reservoir',
      xM: 2,
      yM: 2,
      widthM: 2,
      heightM: 2,
      sizeZM: 1.5,
      label: 'Water tank',
      catalogId: 'tank',
    });
    map.placements.push(
      generateLinearPath({ xM: 2, yM: 6, lengthM: 50, widthM: 2.5, material: 'gravel', label: 'Service lane' }),
    );
  } else if (preset === 'SMALL_FARM' || input.templateId === 'small-farm-100x50') {
    const ghIds = input.childGreenhouseIds ?? ['gh-a', 'gh-b'];
    add({
      id: 'plc-gh-1',
      kind: 'structure',
      role: 'greenhouse',
      xM: 10,
      yM: 10,
      widthM: 14,
      heightM: 8,
      sizeZM: 3.5,
      label: 'Greenhouse A',
      catalogId: 'greenhouse',
      childSpaceId: ghIds[0],
    });
    add({
      id: 'plc-gh-2',
      kind: 'structure',
      role: 'greenhouse',
      xM: 30,
      yM: 10,
      widthM: 14,
      heightM: 8,
      sizeZM: 3.5,
      label: 'Greenhouse B',
      catalogId: 'greenhouse',
      childSpaceId: ghIds[1],
    });
    map.placements.push(
      ...generateParallelBeds(6, { lengthM: 10, widthM: 1.4, heightM: 0.25, raised: true }, 1.5, 10, 28),
    );
    add({
      id: 'plc-tank-1',
      kind: 'irrigation',
      role: 'reservoir',
      xM: 3,
      yM: 3,
      widthM: 2.5,
      heightM: 2.5,
      sizeZM: 1.8,
      label: 'Water tank',
      catalogId: 'tank',
    });
    add({
      id: 'plc-pump-1',
      kind: 'irrigation',
      role: 'pump',
      xM: 6.5,
      yM: 3,
      widthM: 1.2,
      heightM: 1,
      sizeZM: 1,
      label: 'Pump station',
      catalogId: 'pump',
    });
    add({
      id: 'plc-weather-1',
      kind: 'sensor',
      role: 'weather_station',
      xM: 90,
      yM: 5,
      widthM: 0.5,
      heightM: 0.5,
      sizeZM: 2,
      label: 'Weather station',
      catalogId: 'weather-station',
    });
    map.placements.push(
      generateLinearPath({ xM: 5, yM: 42, lengthM: 90, widthM: 3, material: 'gravel', label: 'Main path' }),
      generateLinearPath({ xM: 5, yM: 5, lengthM: 40, widthM: 2, orientationDeg: 90, material: 'concrete', label: 'Access' }),
    );
    map.zones = [
      { id: 'zone-a', name: 'Zone A', xM: 0, yM: 0, widthM: d.lengthM / 2, heightM: d.widthM },
      { id: 'zone-b', name: 'Zone B', xM: d.lengthM / 2, yM: 0, widthM: d.lengthM / 2, heightM: d.widthM },
    ];
  } else if (input.templateId === 'outdoor-beds-20x10') {
    map.placements.push(
      ...generateParallelBeds(6, { lengthM: 16, widthM: 1.2, heightM: 0.2 }, 0.8, 2, 2),
    );
  } else {
    // Generic outdoor zone fallback
    const env = generateEnvironment(preset, d);
    void env;
  }

  const clamped = clampMapToDimensions(map, d);
  clamped.appliedTemplateId = map.appliedTemplateId;
  clamped.heightsAreDefaults = true;
  clamped.environmentPreset = preset;
  clamped.terrainProfile = map.terrainProfile;
  clamped.spatialSchemaVersion = 3;
  clamped.updatedAt = new Date().toISOString();
  return { map: clamped, plants: [], groups: [] };
}

export function isSitePreset(preset: EnvironmentPresetId): boolean {
  return isOutdoorPreset(preset);
}

export function deletePlacementPreservesChildSpace(
  map: SpaceMap,
  placementId: string,
): { map: SpaceMap; removedChildSpaceId?: string } {
  const placement = map.placements.find((p) => p.id === placementId);
  const childSpaceId = placement?.childSpaceId;
  return {
    map: {
      ...map,
      placements: map.placements.filter((p) => p.id !== placementId),
      updatedAt: new Date().toISOString(),
    },
    removedChildSpaceId: childSpaceId,
  };
}
