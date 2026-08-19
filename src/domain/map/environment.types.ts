import type { SpaceDimensions, SpaceType } from '../space/space.types';

export type EnvironmentPresetId =
  | 'GROW_TENT'
  | 'GROW_BOX'
  | 'GROW_ROOM'
  | 'GREENHOUSE'
  | 'VERTICAL_FARM'
  | 'HYDROPONIC_ROOM'
  | 'FACILITY'
  | 'OUTDOOR_ZONE'
  | 'OUTDOOR_GARDEN'
  | 'OPEN_FIELD'
  | 'SMALL_FARM'
  | 'ORCHARD'
  | 'NURSERY'
  | 'GREENHOUSE_SITE';

/** Product environment taxonomy — Spatial Engine is not indoor-only. */
export type EnvironmentType =
  | 'grow_tent'
  | 'grow_box'
  | 'grow_room'
  | 'greenhouse'
  | 'vertical_farm'
  | 'hydroponic_room'
  | 'outdoor_garden'
  | 'open_field'
  | 'farm_zone'
  | 'orchard'
  | 'nursery'
  | 'hydroponics'
  | 'custom';

export type TerrainMaterial = 'soil' | 'grass' | 'gravel' | 'concrete' | 'mulch' | 'hydroFloor';

export type EnvironmentPartKind =
  | 'floor'
  | 'wall'
  | 'ceiling'
  | 'frame'
  | 'panel'
  | 'door'
  | 'mylar'
  | 'table'
  | 'pipe'
  | 'tray'
  | 'seam'
  | 'vent';

export type EnvironmentMaterialId =
  | 'growTentFabric'
  | 'reflectiveMylar'
  | 'growRoomWall'
  | 'concreteFloor'
  | 'hydroFloor'
  | 'metalRack'
  | 'plastic'
  | 'glass'
  | 'greenhouseGlass'
  | 'soil'
  | 'coco'
  | 'water'
  | 'wood'
  | 'rubber'
  | 'qbxBlack'
  | 'qbxGreen'
  | 'floor_concrete'
  | 'floor_soil'
  | 'wall_drywall'
  | 'wall_mylar'
  | 'tent_canvas'
  | 'glass_panel'
  | 'metal_frame'
  | 'ceiling_white'
  | 'naturalSoil'
  | 'wetSoil'
  | 'drySoil'
  | 'grass'
  | 'mulch'
  | 'gravel'
  | 'sand'
  | 'concreteOutdoor'
  | 'woodOutdoor'
  | 'greenhousePath'
  | 'irrigationPlastic'
  | 'metalOutdoor'
  | 'waterSurface'
  | 'shadeNet';

export interface EnvironmentPart {
  id: string;
  kind: EnvironmentPartKind;
  material: EnvironmentMaterialId;
  /** Center in room frame: +X length, +Y width, +Z up. Meters. */
  xM: number;
  yM: number;
  zM: number;
  widthM: number;
  depthM: number;
  heightM: number;
  opacity?: number;
}

export interface ProceduralEnvironment {
  preset: EnvironmentPresetId;
  lengthM: number;
  widthM: number;
  heightM: number;
  parts: EnvironmentPart[];
  notes: string[];
}

export interface EnvironmentPreset {
  id: EnvironmentPresetId;
  label: string;
  defaultDimensions: SpaceDimensions;
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  { id: 'GROW_TENT', label: 'Гроутент', defaultDimensions: { lengthM: 1.2, widthM: 1.2, heightM: 2 } },
  { id: 'GROW_BOX', label: 'Гроубокс', defaultDimensions: { lengthM: 0.5, widthM: 0.5, heightM: 0.8 } },
  { id: 'GROW_ROOM', label: 'Гроурум', defaultDimensions: { lengthM: 4, widthM: 3, heightM: 2.6 } },
  { id: 'GREENHOUSE', label: 'Теплица', defaultDimensions: { lengthM: 8, widthM: 4, heightM: 3.2 } },
  { id: 'VERTICAL_FARM', label: 'Вертикальная ферма', defaultDimensions: { lengthM: 4, widthM: 3, heightM: 2.8 } },
  { id: 'HYDROPONIC_ROOM', label: 'Гидропоника', defaultDimensions: { lengthM: 5, widthM: 3, heightM: 2.6 } },
  { id: 'FACILITY', label: 'Комплекс', defaultDimensions: { lengthM: 24, widthM: 16, heightM: 6 } },
  { id: 'OUTDOOR_ZONE', label: 'Улица', defaultDimensions: { lengthM: 20, widthM: 12, heightM: 4 } },
  { id: 'OUTDOOR_GARDEN', label: 'Сад', defaultDimensions: { lengthM: 10, widthM: 10, heightM: 4 } },
  { id: 'OPEN_FIELD', label: 'Поле', defaultDimensions: { lengthM: 50, widthM: 20, heightM: 4 } },
  { id: 'SMALL_FARM', label: 'Ферма', defaultDimensions: { lengthM: 100, widthM: 50, heightM: 6 } },
  { id: 'ORCHARD', label: 'Сад / Orchard', defaultDimensions: { lengthM: 40, widthM: 30, heightM: 4 } },
  { id: 'NURSERY', label: 'Питомник', defaultDimensions: { lengthM: 20, widthM: 15, heightM: 3 } },
  { id: 'GREENHOUSE_SITE', label: 'Тепличный комплекс', defaultDimensions: { lengthM: 60, widthM: 40, heightM: 5 } },
];

const OUTDOOR_PRESETS: EnvironmentPresetId[] = [
  'OUTDOOR_ZONE',
  'OUTDOOR_GARDEN',
  'OPEN_FIELD',
  'SMALL_FARM',
  'ORCHARD',
  'NURSERY',
  'GREENHOUSE_SITE',
];

const OUTDOOR_TYPES: EnvironmentType[] = [
  'outdoor_garden',
  'open_field',
  'farm_zone',
  'orchard',
  'nursery',
];

export function isOutdoorEnvironment(type: EnvironmentType | EnvironmentPresetId): boolean {
  if (OUTDOOR_PRESETS.includes(type as EnvironmentPresetId)) return true;
  return OUTDOOR_TYPES.includes(type as EnvironmentType);
}

export function isOutdoorPreset(preset: EnvironmentPresetId): boolean {
  return OUTDOOR_PRESETS.includes(preset);
}

export function environmentTypeFromSpace(type?: SpaceType): EnvironmentType {
  switch (type) {
    case 'grow_tent':
    case 'grow_box':
      return 'grow_tent';
    case 'greenhouse':
      return 'greenhouse';
    case 'hydroponics':
      return 'hydroponics';
    case 'outdoor':
      return 'outdoor_garden';
    case 'site':
      return 'open_field';
    case 'facility':
      return 'farm_zone';
    case 'grow_room':
    case 'seedling_area':
      return 'grow_room';
    default:
      return 'custom';
  }
}

export function environmentPresetFromType(type: EnvironmentType): EnvironmentPresetId {
  switch (type) {
    case 'grow_tent':
      return 'GROW_TENT';
    case 'greenhouse':
      return 'GREENHOUSE';
    case 'vertical_farm':
      return 'VERTICAL_FARM';
    case 'hydroponics':
      return 'HYDROPONIC_ROOM';
    case 'outdoor_garden':
      return 'OUTDOOR_GARDEN';
    case 'open_field':
      return 'OPEN_FIELD';
    case 'farm_zone':
      return 'SMALL_FARM';
    case 'orchard':
      return 'ORCHARD';
    case 'nursery':
      return 'NURSERY';
    default:
      return 'GROW_ROOM';
  }
}

export function terrainMaterialForEnvironment(type: EnvironmentType): TerrainMaterial {
  if (type === 'hydroponics') return 'hydroFloor';
  if (type === 'greenhouse' || type === 'outdoor_garden' || type === 'open_field' || type === 'farm_zone') return 'soil';
  return 'concrete';
}
