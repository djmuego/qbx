import type { LayoutPreview } from '../../domain/map/map-blueprint.types';
import type { MapPlacement } from '../../domain/map/space-map.types';
import { createEmptySpaceMap, createPlacement, clampMapToDimensions } from '../../domain/map/space-map.geometry';
import type { Plant, PlantGroup } from '../../domain/grow/plant.types';
import type { TemplateGenerateInput } from '../../domain/map/space-templates.types';
import { GridLayoutStrategy, RackLayoutStrategy } from './layout-strategy';
import { environmentPresetForTemplate } from './environment-generator';
import { defaultSizeZForKind, defaultZForKind } from './spatial-migration';
import { enrichLayoutWithPlantAge } from '../../domain/grow/plant-setup-age';

function equipZ(kind: MapPlacement['kind'], heightM: number, role?: string): number {
  if (role === 'exhaust') return Math.max(0.5, heightM - 0.35);
  return defaultZForKind(kind, heightM);
}

export function generateSpaceLayout(input: TemplateGenerateInput): LayoutPreview {
  const { dimensions: d, spaceId } = input;
  const map = createEmptySpaceMap(spaceId);
  map.appliedTemplateId = input.templateId ?? `${input.spaceType.toLowerCase()}-${d.lengthM}x${d.widthM}`;
  map.heightsAreDefaults = true;
  map.environmentPreset = environmentPresetForTemplate(input.spaceType);

  const rackPlacements: MapPlacement[] = [];
  const rackCount = input.rackCount ?? (input.growMethod === 'rack' ? 1 : 0);
  for (let r = 0; r < rackCount; r += 1) {
    const rackW = Math.min(d.lengthM - 0.2, rackCount > 1 ? (d.lengthM - 0.3) / rackCount - 0.1 : d.lengthM - 0.24);
    const xM = 0.12 + r * (rackW + 0.12);
    rackPlacements.push(
      createPlacement({
        id: `plc-rack-${r + 1}`,
        kind: 'structure',
        role: 'rack',
        xM,
        yM: 0.08,
        zM: 0,
        widthM: rackW,
        heightM: Math.min(0.55, d.widthM - 0.16),
        sizeZM: Math.max(1.4, d.heightM - 0.3),
        rackLevels: 3,
        zSource: 'default_visualization',
        mounting: 'floor',
        label: rackCount > 1 ? `Стеллаж ${r + 1}` : 'Стеллаж',
      }),
    );
  }
  map.placements.push(...rackPlacements);

  const strategy = input.growMethod === 'rack' || rackCount > 0 ? RackLayoutStrategy : GridLayoutStrategy;
  const parentId = rackPlacements[0]?.id;
  const perRack = rackPlacements.length > 1 ? Math.ceil(input.plantCount / rackPlacements.length) : input.plantCount;
  if (rackPlacements.length > 1) {
    rackPlacements.forEach((rack, ri) => {
      const slice = Math.min(perRack, input.plantCount - ri * perRack);
      const plants = RackLayoutStrategy.placePlants({
        count: Math.max(0, slice),
        dimensions: { lengthM: rack.widthM, widthM: rack.heightM, heightM: d.heightM },
        spaceId,
        parentId: rack.id,
      }).map((p, i) => ({
        ...p,
        id: `plc-plant-${ri + 1}-${i + 1}`,
        xM: Number((rack.xM + (p.xM / Math.max(rack.widthM, 0.1)) * rack.widthM * 0.85).toFixed(3)),
        yM: Number((rack.yM + 0.08).toFixed(3)),
        parentId: rack.id,
      }));
      map.placements.push(...plants);
    });
  } else {
    map.placements.push(
      ...strategy.placePlants({
        count: input.plantCount,
        dimensions: d,
        spaceId,
        parentId,
      }),
    );
  }

  const plantsOnMap = map.placements.filter((p) => p.kind === 'plant');
  const plants: Plant[] = plantsOnMap.map((p, i) => {
    const id = `plant-${i + 1}`;
    p.plantId = id;
    return {
      id,
      spaceId,
      name: p.label ?? `Растение #${i + 1}`,
      medium: input.growMethod === 'hydro' ? 'hydro' : 'coco',
      crop: input.cropName,
      canopyDiameterM: p.canopyDiameterM,
      plantHeightM: p.plantHeightM,
    };
  });
  const groups: PlantGroup[] = plants.length
    ? [{ id: 'pgrp-1', spaceId, name: 'Группа A', plantIds: plants.map((p) => p.id) }]
    : [];

  const e = input.equipment;
  const add = (placement: Parameters<typeof createPlacement>[0]) => {
    map.placements.push(
      createPlacement({
        ...placement,
        zSource: 'default_visualization',
        sizeZM: placement.sizeZM ?? defaultSizeZForKind(placement.kind),
      }),
    );
  };

  if (e.mainLight) {
    const lights = input.spaceType === 'GROW_ROOM' || d.lengthM >= 2 ? 2 : 1;
    for (let i = 0; i < lights; i += 1) {
      const w = Math.min(0.7, d.lengthM * 0.45);
      add({
        id: `plc-light-${i + 1}`,
        kind: 'light',
        role: 'main',
        xM: d.lengthM * (lights === 1 ? 0.5 : (i + 1) / (lights + 1)) - w / 2,
        yM: d.widthM * 0.5 - 0.12,
        zM: equipZ('light', d.heightM),
        widthM: w,
        heightM: 0.24,
        mounting: 'hanging',
        label: lights > 1 ? `Свет ${i + 1}` : 'Свет',
      });
    }
  }
  if (e.exhaust) {
    add({
      id: 'plc-exhaust-1',
      kind: 'equipment',
      role: 'exhaust',
      xM: d.lengthM - 0.28,
      yM: d.widthM / 2 - 0.12,
      zM: equipZ('equipment', d.heightM, 'exhaust'),
      widthM: 0.24,
      heightM: 0.24,
      mounting: 'wall',
      label: 'Вытяжка',
    });
  }
  if (e.circulationFan) {
    const fans = d.lengthM >= 2 ? 2 : 1;
    for (let i = 0; i < fans; i += 1) {
      add({
        id: `plc-circ-${i + 1}`,
        kind: 'equipment',
        role: 'circulation',
        xM: 0.06,
        yM: d.widthM * (fans === 1 ? 0.72 : 0.25 + i * 0.5) - 0.1,
        zM: d.heightM * 0.45,
        widthM: 0.18,
        heightM: 0.18,
        mounting: 'wall',
        label: fans > 1 ? `Вентилятор ${i + 1}` : 'Циркуляция',
      });
    }
  }
  if (e.climateSensor) {
    const sensors = d.lengthM * d.widthM >= 8 ? 2 : 1;
    for (let i = 0; i < sensors; i += 1) {
      add({
        id: `plc-sensor-${i + 1}`,
        kind: 'sensor',
        role: 'climate',
        xM: d.lengthM * (sensors === 1 ? 0.5 : 0.28 + i * 0.44) - 0.08,
        yM: d.widthM * 0.5 - 0.08,
        zM: equipZ('sensor', d.heightM),
        widthM: 0.16,
        heightM: 0.16,
        mounting: 'hanging',
        label: sensors > 1 ? `Датчик климата ${i + 1}` : 'Датчик климата',
      });
    }
  }
  if (e.substrateSensor) {
    add({
      id: 'plc-soil-1',
      kind: 'sensor',
      role: 'soil',
      xM: d.lengthM * 0.4,
      yM: d.widthM * 0.4,
      zM: 0.08,
      widthM: 0.14,
      heightM: 0.14,
      mounting: 'floor',
      label: 'Датчик субстрата',
    });
  }
  if (e.tank || e.irrigation) {
    add({
      id: 'plc-tank-1',
      kind: 'irrigation',
      role: 'reservoir',
      xM: 0.08,
      yM: 0.08,
      zM: 0,
      widthM: 0.32,
      heightM: 0.28,
      mounting: 'floor',
      label: 'Бак',
    });
  }
  if (e.irrigation) {
    add({
      id: 'plc-pump-1',
      kind: 'irrigation',
      role: 'pump',
      xM: 0.42,
      yM: 0.08,
      zM: 0,
      widthM: 0.18,
      heightM: 0.16,
      mounting: 'floor',
      label: 'Полив',
    });
  }
  if (e.camera) {
    add({
      id: 'plc-cam-1',
      kind: 'camera',
      xM: d.lengthM * 0.08,
      yM: d.widthM - 0.22,
      zM: equipZ('camera', d.heightM),
      widthM: 0.14,
      heightM: 0.12,
      mounting: 'wall',
      label: 'Камера',
    });
  }
  if (e.hub) {
    add({
      id: 'plc-hub-1',
      kind: 'hub',
      xM: 0.06,
      yM: 0.06,
      zM: equipZ('hub', d.heightM),
      widthM: 0.18,
      heightM: 0.12,
      mounting: 'wall',
      label: 'QBX Hub',
    });
  }

  if (input.spaceType === 'FACILITY' || input.spaceType === 'SITE' || input.spaceType === 'GREENHOUSE') {
    map.zones = [
      { id: 'zone-1', name: 'Zone A', xM: 0, yM: 0, widthM: d.lengthM / 2, heightM: d.widthM },
      { id: 'zone-2', name: 'Zone B', xM: d.lengthM / 2, yM: 0, widthM: d.lengthM / 2, heightM: d.widthM },
    ];
  }

  const clamped = clampMapToDimensions(map, d);
  clamped.appliedTemplateId = map.appliedTemplateId;
  clamped.heightsAreDefaults = true;
  clamped.environmentPreset = map.environmentPreset;
  clamped.updatedAt = new Date().toISOString();
  const layout = { map: clamped, plants, groups };
  if (input.plantAgeDays && input.plantAgeDays > 0) {
    return enrichLayoutWithPlantAge(layout, input.plantAgeDays);
  }
  return layout;
}
