import type { LayoutPreview, MapBlueprint } from '../../domain/map/map-blueprint.types';
import { createEmptySpaceMap, createPlacement } from '../../domain/map/space-map.geometry';
import type { Plant, PlantGroup } from '../../domain/grow/plant.types';
import { plantedAtFromAgeDays } from '../../domain/grow/plant-setup-age';

export function layoutFromBlueprint(blueprint: MapBlueprint, spaceId: string): LayoutPreview {
  const map = createEmptySpaceMap(spaceId);
  map.zones = blueprint.zones.map((z, i) => ({
    id: `zone-${i + 1}`,
    name: z.name,
    xM: z.xM,
    yM: z.yM,
    widthM: z.widthM,
    heightM: z.heightM,
  }));

  for (const obj of blueprint.objects.filter((o) => o.origin === 'existing')) {
    map.placements.push(
      createPlacement({
        id: obj.id,
        kind: obj.type,
        xM: obj.suggestedPosition.xM,
        yM: obj.suggestedPosition.yM,
        zM: obj.suggestedPosition.zM ?? 0,
        widthM: obj.dimensions.widthM,
        heightM: obj.dimensions.heightM,
        rotationDeg: obj.rotationDeg,
        label: obj.name,
        zoneId: map.zones.find((z) => z.name === obj.zone)?.id,
      }),
    );
  }

  const plants: Plant[] = [];
  const groups: PlantGroup[] = [];

  blueprint.plantGroups.forEach((group, gi) => {
    const groupId = `pgrp-${gi + 1}`;
    const plantIds: string[] = [];
    for (let i = 0; i < group.count; i += 1) {
      const id = `plant-${gi + 1}-${i + 1}`;
      plantIds.push(id);
      const ageDays = group.ageDays ?? blueprint.defaultPlantAgeDays ?? 0;
      plants.push({
        id,
        spaceId,
        name: `${group.name} #${i + 1}`,
        cultivar: group.crop,
        crop: group.crop,
        plantedAt: ageDays > 0 ? plantedAtFromAgeDays(ageDays) : undefined,
        growthMode: 'auto',
      });
    }
    groups.push({ id: groupId, spaceId, name: group.name, plantIds });
    const dim = group.dimensions ?? { widthM: 2, heightM: 0.6 };
    map.placements.push(
      createPlacement({
        id: `pg-${gi + 1}`,
        kind: 'plant_group',
        xM: group.position.xM,
        yM: group.position.yM,
        widthM: dim.widthM,
        heightM: dim.heightM,
        label: `${group.name} ×${group.count}`,
        zoneId: map.zones.find((z) => z.name === group.zone)?.id,
      }),
    );
  });

  map.updatedAt = new Date().toISOString();
  return { map, plants, groups };
}
