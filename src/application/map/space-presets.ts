import type { LayoutPreview } from '../../domain/map/map-blueprint.types';
import type { SpaceTemplateDef, TemplateGenerateInput } from '../../domain/map/space-templates.types';
import { DEFAULT_EQUIPMENT } from '../../domain/map/space-templates.types';
import { generateSpaceLayout } from './template-generator';
import { generateSiteLayout } from './site-template-generator';

const full = DEFAULT_EQUIPMENT;
const tentEq = { ...DEFAULT_EQUIPMENT, irrigation: false, tank: false, camera: false };

export const SPACE_PRESETS: SpaceTemplateDef[] = [
  {
    id: 'tent-60',
    name: 'Grow Tent 60×60',
    scale: 'L1_MICRO',
    spaceType: 'GROW_TENT',
    environment: 'GROW_TENT',
    dimensions: { lengthM: 0.6, widthM: 0.6, heightM: 1.4 },
    growMethod: 'pots',
    plantCount: 1,
    equipment: { ...tentEq, circulationFan: false, hub: true },
  },
  {
    id: 'tent-80-4',
    name: 'Grow Tent 80×80',
    scale: 'L1_MICRO',
    spaceType: 'GROW_TENT',
    environment: 'GROW_TENT',
    dimensions: { lengthM: 0.8, widthM: 0.8, heightM: 1.8 },
    growMethod: 'pots',
    plantCount: 4,
    equipment: tentEq,
  },
  {
    id: 'tent-100',
    name: 'Grow Tent 100×100',
    scale: 'L1_MICRO',
    spaceType: 'GROW_TENT',
    environment: 'GROW_TENT',
    dimensions: { lengthM: 1, widthM: 1, heightM: 2 },
    growMethod: 'pots',
    plantCount: 4,
    equipment: tentEq,
  },
  {
    id: 'tent-120-9',
    name: 'Grow Tent 120×120',
    scale: 'L1_MICRO',
    spaceType: 'GROW_TENT',
    environment: 'GROW_TENT',
    dimensions: { lengthM: 1.2, widthM: 1.2, heightM: 2 },
    growMethod: 'pots',
    plantCount: 9,
    equipment: tentEq,
  },
  {
    id: 'tent-150',
    name: 'Grow Tent 150×150',
    scale: 'L1_MICRO',
    spaceType: 'GROW_TENT',
    environment: 'GROW_TENT',
    dimensions: { lengthM: 1.5, widthM: 1.5, heightM: 2 },
    growMethod: 'pots',
    plantCount: 9,
    equipment: tentEq,
  },
  {
    id: 'tent-120-240',
    name: 'Grow Tent 120×240',
    scale: 'L1_MICRO',
    spaceType: 'GROW_TENT',
    environment: 'GROW_TENT',
    dimensions: { lengthM: 2.4, widthM: 1.2, heightM: 2 },
    growMethod: 'pots',
    plantCount: 12,
    equipment: { ...tentEq, irrigation: true, tank: true },
  },
  {
    id: 'grow-box',
    name: 'Grow Box',
    scale: 'L1_MICRO',
    spaceType: 'GROW_BOX',
    environment: 'GROW_BOX',
    dimensions: { lengthM: 0.5, widthM: 0.5, heightM: 0.8 },
    growMethod: 'pots',
    plantCount: 1,
    equipment: { ...tentEq, exhaust: true, circulationFan: false },
  },
  {
    id: 'custom-tent',
    name: 'Custom Grow Tent',
    scale: 'L1_MICRO',
    spaceType: 'GROW_TENT',
    environment: 'GROW_TENT',
    dimensions: { lengthM: 1.2, widthM: 1.2, heightM: 2 },
    growMethod: 'pots',
    plantCount: 4,
    equipment: tentEq,
    customizable: true,
  },
  {
    id: 'grow-room',
    name: 'Grow Room',
    scale: 'L2_ROOM',
    spaceType: 'GROW_ROOM',
    environment: 'GROW_ROOM',
    dimensions: { lengthM: 4, widthM: 3, heightM: 2.6 },
    growMethod: 'pots',
    plantCount: 16,
    equipment: { ...full, irrigation: true, tank: true, camera: true },
  },
  {
    id: 'custom-room',
    name: 'Custom Room',
    scale: 'L2_ROOM',
    spaceType: 'CUSTOM_ROOM',
    environment: 'GROW_ROOM',
    dimensions: { lengthM: 4, widthM: 3, heightM: 2.6 },
    growMethod: 'pots',
    plantCount: 12,
    equipment: full,
    customizable: true,
  },
  {
    id: 'vertical-rack-3',
    name: 'Vertical Rack',
    scale: 'L2_ROOM',
    spaceType: 'RACK',
    environment: 'VERTICAL_FARM',
    dimensions: { lengthM: 1.2, widthM: 0.6, heightM: 2 },
    growMethod: 'rack',
    plantCount: 9,
    rackCount: 1,
    equipment: { ...tentEq, circulationFan: true },
  },
  {
    id: 'multi-rack-room',
    name: 'Multi-Rack Room',
    scale: 'L2_ROOM',
    spaceType: 'RACK',
    environment: 'VERTICAL_FARM',
    dimensions: { lengthM: 4, widthM: 3, heightM: 2.8 },
    growMethod: 'rack',
    plantCount: 18,
    rackCount: 3,
    equipment: { ...full, irrigation: true, tank: true },
  },
  {
    id: 'hydro-room',
    name: 'Hydroponic Room',
    scale: 'L2_ROOM',
    spaceType: 'HYDROPONIC_ZONE',
    environment: 'HYDROPONIC_ROOM',
    dimensions: { lengthM: 5, widthM: 3, heightM: 2.6 },
    growMethod: 'hydro',
    plantCount: 16,
    equipment: { ...full, irrigation: true, tank: true, substrateSensor: false },
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    scale: 'L3_FACILITY',
    spaceType: 'GREENHOUSE',
    environment: 'GREENHOUSE',
    dimensions: { lengthM: 8, widthM: 4, heightM: 3.2 },
    growMethod: 'bed',
    plantCount: 24,
    equipment: { ...full, irrigation: true, tank: true, camera: true },
  },
  {
    id: 'custom-greenhouse',
    name: 'Custom Greenhouse',
    scale: 'L3_FACILITY',
    spaceType: 'GREENHOUSE',
    environment: 'GREENHOUSE',
    dimensions: { lengthM: 12, widthM: 6, heightM: 3.5 },
    growMethod: 'bed',
    plantCount: 36,
    equipment: full,
    customizable: true,
  },
  {
    id: 'small-garden-10',
    name: 'Small Garden 10×10 m',
    scale: 'L4_SITE',
    spaceType: 'OUTDOOR_GARDEN',
    environment: 'OUTDOOR_GARDEN',
    dimensions: { lengthM: 10, widthM: 10, heightM: 4 },
    growMethod: 'bed',
    plantCount: 0,
    equipment: { ...tentEq, mainLight: false, exhaust: false, circulationFan: false },
  },
  {
    id: 'outdoor-beds-20x10',
    name: 'Outdoor Beds 20×10 m',
    scale: 'L4_SITE',
    spaceType: 'OUTDOOR_GARDEN',
    environment: 'OUTDOOR_GARDEN',
    dimensions: { lengthM: 20, widthM: 10, heightM: 4 },
    growMethod: 'bed',
    plantCount: 0,
    equipment: { ...tentEq, mainLight: false, exhaust: false, circulationFan: false },
  },
  {
    id: 'open-field-rows',
    name: 'Open Field Rows 50×20 m',
    scale: 'L4_SITE',
    spaceType: 'OPEN_FIELD',
    environment: 'OPEN_FIELD',
    dimensions: { lengthM: 50, widthM: 20, heightM: 4 },
    growMethod: 'bed',
    plantCount: 0,
    equipment: { ...tentEq, mainLight: false, exhaust: false, circulationFan: false },
  },
  {
    id: 'greenhouse-outdoor',
    name: 'Greenhouse + Outdoor Utility',
    scale: 'L4_SITE',
    spaceType: 'FARM_SITE',
    environment: 'GREENHOUSE_SITE',
    dimensions: { lengthM: 40, widthM: 30, heightM: 5 },
    growMethod: 'bed',
    plantCount: 0,
    equipment: { ...tentEq, tank: true, irrigation: true },
  },
  {
    id: 'small-farm-100x50',
    name: 'Small Farm Site 100×50 m',
    scale: 'L4_SITE',
    spaceType: 'FARM_SITE',
    environment: 'SMALL_FARM',
    dimensions: { lengthM: 100, widthM: 50, heightM: 6 },
    growMethod: 'bed',
    plantCount: 0,
    equipment: { ...tentEq, tank: true, irrigation: true, climateSensor: true },
  },
  {
    id: 'nursery-yard',
    name: 'Nursery / Seedling Yard',
    scale: 'L4_SITE',
    spaceType: 'NURSERY',
    environment: 'NURSERY',
    dimensions: { lengthM: 20, widthM: 15, heightM: 3 },
    growMethod: 'bed',
    plantCount: 0,
    equipment: { ...tentEq, mainLight: false, exhaust: false },
  },
  {
    id: 'orchard-rows',
    name: 'Orchard Rows',
    scale: 'L4_SITE',
    spaceType: 'ORCHARD',
    environment: 'ORCHARD',
    dimensions: { lengthM: 40, widthM: 30, heightM: 4 },
    growMethod: 'custom',
    plantCount: 0,
    equipment: { ...tentEq, mainLight: false, exhaust: false, circulationFan: false },
  },
];

/** @deprecated alias — tests and older calls */
export const GRID_PRESETS = SPACE_PRESETS;

export function applyNamedPreset(id: string, spaceId = 'space-preset'): LayoutPreview {
  const preset = SPACE_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown preset ${id}`);
  const outdoorTypes = new Set([
    'OUTDOOR_GARDEN',
    'OPEN_FIELD',
    'FARM_SITE',
    'ORCHARD',
    'NURSERY',
    'SITE',
  ]);
  if (outdoorTypes.has(preset.spaceType)) {
    return generateSiteLayout({
      spaceId,
      preset: preset.environment,
      dimensions: preset.dimensions,
      templateId: preset.id,
    });
  }
  const input: TemplateGenerateInput = {
    spaceId,
    spaceType: preset.spaceType,
    dimensions: preset.dimensions,
    growMethod: preset.growMethod,
    plantCount: preset.plantCount,
    equipment: preset.equipment,
    rackCount: preset.rackCount,
    templateId: preset.id,
  };
  return generateSpaceLayout(input);
}

export function templateSpaceTypeToSpaceType(type: SpaceTemplateDef['spaceType']): import('../../domain/space/space.types').SpaceType {
  switch (type) {
    case 'GROW_BOX':
      return 'grow_box';
    case 'GROW_TENT':
      return 'grow_tent';
    case 'GREENHOUSE':
      return 'greenhouse';
    case 'HYDROPONIC_ZONE':
      return 'hydroponics';
    case 'FACILITY':
      return 'facility';
    case 'SITE':
    case 'FARM_SITE':
      return 'site';
    case 'OUTDOOR_GARDEN':
    case 'OPEN_FIELD':
    case 'ORCHARD':
    case 'NURSERY':
      return 'outdoor';
    case 'RACK':
      return 'grow_room';
    default:
      return 'grow_room';
  }
}
