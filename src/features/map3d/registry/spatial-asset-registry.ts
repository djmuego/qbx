import type { SpatialAssetCategory, SpatialAssetDescriptor } from '../../../domain/map/visual-assets.types';

function sprite(
  id: string,
  category: SpatialAssetCategory,
  source: string,
  opts: Partial<SpatialAssetDescriptor> = {},
): SpatialAssetDescriptor {
  const widthM = opts.defaultScale?.widthM ?? 0.3;
  const heightM = opts.defaultScale?.heightM ?? opts.defaultHeightM ?? 0.45;
  return {
    id,
    category,
    source,
    renderType: 'sprite',
    defaultScale: { widthM, heightM, depthM: opts.defaultScale?.depthM ?? widthM },
    anchor: opts.anchor ?? 'bottom-center',
    defaultHeightM: opts.defaultHeightM ?? heightM,
    billboard: opts.billboard ?? 'vertical-billboard',
    mobileLod: 'sprite',
    objectSprite: opts.objectSprite ?? true,
    includesContainer: opts.includesContainer ?? false,
    aspectRatio: opts.aspectRatio ?? widthM / heightM,
    ...opts,
  };
}

function procedural(
  id: string,
  category: SpatialAssetCategory,
  opts: Partial<SpatialAssetDescriptor> = {},
): SpatialAssetDescriptor {
  return {
    id,
    category,
    renderType: 'procedural',
    defaultScale: { widthM: 0.2, heightM: 0.2, depthM: 0.2 },
    anchor: 'center',
    defaultHeightM: 0.2,
    billboard: 'fixed-orientation',
    mobileLod: 'procedural',
    objectSprite: false,
    ...opts,
  };
}

const PLANT_STAGES: SpatialAssetDescriptor[] = Array.from({ length: 9 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return sprite(`plant.stage.${n}`, 'plants', `/assets/spatial/plants/growth/plant-stage-${n}.webp`, {
    packFile: `plant-growth-sheet-9/stage-${n}`,
    includesContainer: true,
    billboard: 'cross-billboard',
    defaultScale: { widthM: 0.28, heightM: 0.42, depthM: 0.28 },
    defaultHeightM: 0.42,
    aspectRatio: 0.67,
  });
});

const SPATIAL_ASSETS: SpatialAssetDescriptor[] = [
  ...PLANT_STAGES,
  sprite('plant.generic', 'plants', '/assets/spatial/plants/plant-generic.webp', {
    packFile: '3',
    includesContainer: true,
    billboard: 'cross-billboard',
    defaultScale: { widthM: 0.3, heightM: 0.45, depthM: 0.3 },
    defaultHeightM: 0.45,
  }),
  sprite('plant.seedling', 'plants', '/assets/spatial/plants/plant-seedling.webp', {
    packFile: '2',
    includesContainer: true,
    billboard: 'cross-billboard',
    defaultScale: { widthM: 0.18, heightM: 0.28, depthM: 0.18 },
    defaultHeightM: 0.28,
  }),
  sprite('plant.vegetative', 'plants', '/assets/spatial/plants/plant-vegetative.webp', {
    packFile: '1',
    includesContainer: true,
    billboard: 'cross-billboard',
    defaultScale: { widthM: 0.32, heightM: 0.48, depthM: 0.32 },
    defaultHeightM: 0.48,
  }),
  sprite('plant.hydro', 'plants', '/assets/spatial/plants/plant-vegetative-smart-pot.png', {
    packFile: 'plant-vegetative-smart-pot',
    includesContainer: true,
    billboard: 'cross-billboard',
    defaultScale: { widthM: 0.3, heightM: 0.45, depthM: 0.3 },
    defaultHeightM: 0.45,
  }),

  sprite('light.panel', 'lighting', '/assets/spatial/lighting/light-panel.webp', {
    packFile: '24',
    anchor: 'top-center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.6, heightM: 0.05, depthM: 0.6 },
    defaultHeightM: 0.05,
    aspectRatio: 12,
  }),
  sprite('light.bar', 'lighting', '/assets/spatial/lighting/light-bar.webp', {
    packFile: '17',
    anchor: 'top-center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.9, heightM: 0.06, depthM: 0.08 },
    defaultHeightM: 0.06,
    aspectRatio: 15,
  }),

  sprite('climate.exhaust', 'climate', '/assets/spatial/climate/exhaust-fan.webp', {
    packFile: '16',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.35, heightM: 0.35, depthM: 0.12 },
    defaultHeightM: 0.35,
  }),
  sprite('climate.exhaust-fan', 'climate', '/assets/spatial/climate/exhaust-fan.webp', {
    packFile: '16',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.35, heightM: 0.35, depthM: 0.12 },
    defaultHeightM: 0.35,
  }),
  sprite('climate.exhaust-inline', 'climate', '/assets/spatial/climate/exhaust-inline.webp', {
    packFile: '16-inline',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.4, heightM: 0.25, depthM: 0.15 },
    defaultHeightM: 0.25,
  }),
  sprite('climate.exhaust-wall', 'climate', '/assets/spatial/climate/exhaust-wall.webp', {
    packFile: '25',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.3, heightM: 0.3, depthM: 0.1 },
    defaultHeightM: 0.3,
  }),
  sprite('climate.circulation', 'climate', '/assets/spatial/climate/circulation-fan.webp', {
    packFile: '15',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.28, heightM: 0.28, depthM: 0.1 },
    defaultHeightM: 0.28,
  }),
  sprite('climate.circulation-fan', 'climate', '/assets/spatial/climate/circulation-fan.webp', {
    packFile: '15',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.28, heightM: 0.28, depthM: 0.1 },
    defaultHeightM: 0.28,
  }),
  sprite('climate.circulation-wall', 'climate', '/assets/spatial/climate/circulation-wall.webp', {
    packFile: '26',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.25, heightM: 0.25, depthM: 0.08 },
    defaultHeightM: 0.25,
  }),
  sprite('climate.filter', 'climate', '/assets/spatial/climate/carbon-filter.webp', {
    packFile: '5',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.2, heightM: 0.5, depthM: 0.2 },
    defaultHeightM: 0.5,
    aspectRatio: 0.4,
  }),
  sprite('climate.carbon-filter', 'climate', '/assets/spatial/climate/carbon-filter.webp', {
    packFile: '5',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.2, heightM: 0.5, depthM: 0.2 },
    defaultHeightM: 0.5,
    aspectRatio: 0.4,
  }),
  sprite('climate.humidifier', 'climate', '/assets/spatial/climate/humidifier.png', {
    packFile: '27',
    anchor: 'bottom-center',
    billboard: 'vertical-billboard',
    defaultScale: { widthM: 0.22, heightM: 0.35, depthM: 0.22 },
    defaultHeightM: 0.35,
  }),
  procedural('climate.heater', 'climate', { objectSprite: false }),

  sprite('sensor.environment', 'sensors', '/assets/spatial/sensors/sensor-environment.png', {
    packFile: '28',
    anchor: 'center',
    billboard: 'camera-facing',
    defaultScale: { widthM: 0.1, heightM: 0.1, depthM: 0.06 },
    defaultHeightM: 0.1,
  }),
  procedural('sensor.soil', 'sensors', { objectSprite: false }),
  procedural('sensor.co2', 'sensors', { objectSprite: false }),

  sprite('irrigation.pump', 'irrigation', '/assets/spatial/irrigation/pump.png', {
    packFile: '31',
    anchor: 'bottom-center',
    billboard: 'vertical-billboard',
    defaultScale: { widthM: 0.2, heightM: 0.18, depthM: 0.2 },
    defaultHeightM: 0.18,
  }),
  sprite('irrigation.tank', 'irrigation', '/assets/spatial/irrigation/tank.png', {
    packFile: '32',
    anchor: 'bottom-center',
    billboard: 'vertical-billboard',
    defaultScale: { widthM: 0.35, heightM: 0.45, depthM: 0.35 },
    defaultHeightM: 0.45,
  }),
  sprite('irrigation.nutrients', 'irrigation', '/assets/spatial/irrigation/nutrients.webp', {
    packFile: '33',
    anchor: 'bottom-center',
    billboard: 'vertical-billboard',
    defaultScale: { widthM: 0.15, heightM: 0.22, depthM: 0.15 },
    defaultHeightM: 0.22,
  }),

  sprite('qbx.controller', 'qbx', '/assets/spatial/qbx/controller.png', {
    packFile: '29',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.18, heightM: 0.12, depthM: 0.05 },
    defaultHeightM: 0.12,
    aspectRatio: 1.5,
  }),
  sprite('qbx.relay', 'qbx', '/assets/spatial/qbx/sensor-module.png', {
    packFile: '30',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.14, heightM: 0.1, depthM: 0.04 },
    defaultHeightM: 0.1,
  }),

  sprite('camera.generic', 'cameras', '/assets/spatial/cameras/camera-generic.png', {
    packFile: '34',
    anchor: 'center',
    billboard: 'camera-facing',
    defaultScale: { widthM: 0.12, heightM: 0.1, depthM: 0.08 },
    defaultHeightM: 0.1,
  }),

  sprite('electrical.socket', 'electrical', '/assets/spatial/electrical/power-strip.png', {
    packFile: '35',
    anchor: 'center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.25, heightM: 0.08, depthM: 0.06 },
    defaultHeightM: 0.08,
    aspectRatio: 3.1,
  }),
  procedural('electrical.panel', 'electrical', { objectSprite: false }),

  sprite('infrastructure.rack', 'infrastructure', '/assets/spatial/infrastructure/rack.png', {
    packFile: '38',
    anchor: 'bottom-center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.6, heightM: 0.5, depthM: 0.4 },
    defaultHeightM: 0.5,
  }),
  sprite('infrastructure.grow-bed', 'infrastructure', '/assets/spatial/infrastructure/grow-bed.png', {
    packFile: '39',
    anchor: 'bottom-center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.8, heightM: 0.15, depthM: 0.4 },
    defaultHeightM: 0.15,
  }),
  sprite('infrastructure.grow-tent', 'infrastructure', '/assets/spatial/infrastructure/grow-tent.png', {
    packFile: '40',
    anchor: 'bottom-center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 1.2, heightM: 2.0, depthM: 1.2 },
    defaultHeightM: 2.0,
    objectSprite: false,
  }),
  sprite('infrastructure.table', 'infrastructure', '/assets/spatial/infrastructure/table-and-tent.png', {
    packFile: '41',
    anchor: 'bottom-center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 0.9, heightM: 0.75, depthM: 0.5 },
    defaultHeightM: 0.75,
  }),
  procedural('infrastructure.shelf', 'infrastructure', { objectSprite: false }),

  sprite('environment.floor-tile', 'misc', '/assets/spatial/environment/floor-concrete-tile.png', {
    objectSprite: false,
    anchor: 'bottom-center',
    billboard: 'fixed-orientation',
    defaultScale: { widthM: 1, heightM: 0.02, depthM: 1 },
    defaultHeightM: 0.02,
  }),

  procedural('fallback.procedural', 'misc', { objectSprite: false }),
];

const BY_ID = new Map(SPATIAL_ASSETS.map((a) => [a.id, a]));

export function spatialAssetById(id: string): SpatialAssetDescriptor | undefined {
  return BY_ID.get(id);
}

export function allSpatialAssets(): SpatialAssetDescriptor[] {
  return SPATIAL_ASSETS;
}

export function objectSpriteAssets(): SpatialAssetDescriptor[] {
  return SPATIAL_ASSETS.filter((a) => a.objectSprite);
}
