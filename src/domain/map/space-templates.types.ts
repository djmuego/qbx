import type { SpaceDimensions } from '../space/space.types';
import type { EnvironmentPresetId } from './environment.types';
import type { SpatialScale } from './spatial-hierarchy';

export type TemplateSpaceType =
  | 'GROW_TENT'
  | 'GROW_BOX'
  | 'GROW_ROOM'
  | 'GREENHOUSE'
  | 'RACK'
  | 'HYDROPONIC_ZONE'
  | 'CUSTOM_ROOM'
  | 'FACILITY'
  | 'SITE'
  | 'OUTDOOR_GARDEN'
  | 'OPEN_FIELD'
  | 'FARM_SITE'
  | 'ORCHARD'
  | 'NURSERY';

export type GrowMethod = 'pots' | 'bed' | 'rack' | 'hydro' | 'custom';

export interface TemplateEquipmentFlags {
  mainLight: boolean;
  exhaust: boolean;
  circulationFan: boolean;
  climateSensor: boolean;
  substrateSensor: boolean;
  irrigation: boolean;
  tank: boolean;
  camera: boolean;
  hub: boolean;
}

export interface TemplateGenerateInput {
  spaceId: string;
  spaceType: TemplateSpaceType;
  dimensions: SpaceDimensions;
  growMethod: GrowMethod;
  plantCount: number;
  equipment: TemplateEquipmentFlags;
  rackCount?: number;
  templateId?: string;
  /** Days since planting — mature plants show correct growth visual on the map */
  plantAgeDays?: number;
  cropName?: string;
}

export interface SpaceTemplateDef {
  id: string;
  name: string;
  scale: SpatialScale;
  spaceType: TemplateSpaceType;
  environment: EnvironmentPresetId;
  dimensions: SpaceDimensions;
  growMethod: GrowMethod;
  plantCount: number;
  rackCount?: number;
  equipment: TemplateEquipmentFlags;
  customizable?: boolean;
}

export const DEFAULT_EQUIPMENT: TemplateEquipmentFlags = {
  mainLight: true,
  exhaust: true,
  circulationFan: true,
  climateSensor: true,
  substrateSensor: false,
  irrigation: false,
  tank: false,
  camera: false,
  hub: true,
};
