export type MapObjectKind =
  | 'plant'
  | 'plant_group'
  | 'sensor'
  | 'equipment'
  | 'light'
  | 'irrigation'
  | 'structure'
  | 'camera'
  | 'hub'
  | 'outlet'
  | 'electrical_panel';

export type CompassQuadrant = 'NW' | 'NE' | 'SW' | 'SE';

export type MapMounting = 'floor' | 'wall' | 'ceiling' | 'hanging' | 'rack_level' | 'rack' | 'plantCanopy' | 'free';
export type SpatialZSource = 'user' | 'default_visualization';

export type ZoneType = 'climate' | 'vegetative' | 'flowering' | 'irrigation' | 'custom';

export type SpatialRelationType =
  | 'sensor_monitors_zone'
  | 'light_illuminates_group'
  | 'fan_serves_space'
  | 'pump_supplies_zone'
  | 'camera_observes_zone'
  | 'device_mounted_on'
  | 'powered_from';

export interface SpatialRelationship {
  id: string;
  type: SpatialRelationType;
  fromId: string;
  toId: string;
}

export interface MapPlacement {
  id: string;
  kind: MapObjectKind;
  xM: number;
  yM: number;
  zM?: number;
  widthM: number;
  heightM: number;
  rotationDeg: number;
  rotationXM?: number;
  rotationZM?: number;
  zoneId?: string;
  plantId?: string;
  deviceId?: string;
  sensorId?: string;
  outputId?: string;
  label?: string;
  notes?: string;
  /** Vertical size of the object (3D). Plan-view depth stays `heightM`. */
  sizeZM?: number;
  mounting?: MapMounting;
  zSource?: SpatialZSource;
  role?: string;
  catalogId?: string;
  /** In-room hierarchy: plant → rack, sensor → bed, etc. */
  parentId?: string;
  rackLevels?: number;
  rackLevel?: number;
  canopyDiameterM?: number;
  plantHeightM?: number;
  groupRows?: number;
  groupCols?: number;
  spacingXM?: number;
  spacingYM?: number;
  ratedPowerW?: number;
  ratedVoltageV?: number;
  powerConnectionId?: string;
  fovDeg?: number;
  beamAngleDeg?: number;
  coverageWidthM?: number;
  coverageDepthM?: number;
  /** Nested space link — e.g. greenhouse structure → inner greenhouse map. */
  childSpaceId?: string;
  cropProfileId?: string;
  growRunId?: string;
  medium?: string;
  bedHeightM?: number;
  /** Plant row endpoints (meters, plan view). */
  rowStartXM?: number;
  rowStartYM?: number;
  rowEndXM?: number;
  rowEndYM?: number;
  rowSpacingM?: number;
  plantCount?: number;
}

export interface MapZone {
  id: string;
  name: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
  type?: ZoneType;
}

export interface SpaceMap {
  spaceId: string;
  schemaVersion: 1;
  /** Spatial object model version. Envelope schemaVersion stays 1. */
  spatialSchemaVersion?: 1 | 2 | 3;
  gridStepM: number;
  northOffsetDeg: number;
  terrainProfile?: import('./terrain.types').TerrainProfile;
  zones: MapZone[];
  placements: MapPlacement[];
  relationships?: SpatialRelationship[];
  electrical?: import('../electrical/electrical.types').ElectricalPlan;
  updatedAt: string;
  appliedTemplateId?: string;
  heightsAreDefaults?: boolean;
  environmentPreset?: import('./environment.types').EnvironmentPresetId;
}

export interface SpaceBounds {
  lengthM: number;
  widthM: number;
}

export interface PointM {
  xM: number;
  yM: number;
}

export const MAP_OBJECT_KINDS: MapObjectKind[] = [
  'plant',
  'plant_group',
  'sensor',
  'equipment',
  'light',
  'irrigation',
  'structure',
  'camera',
  'hub',
  'outlet',
  'electrical_panel',
];

export const MAP_KIND_LABELS: Record<MapObjectKind, string> = {
  plant: 'Растение',
  plant_group: 'Группа растений',
  sensor: 'Датчик',
  equipment: 'Оборудование',
  light: 'Свет',
  irrigation: 'Полив',
  structure: 'Конструкция',
  camera: 'Камера',
  hub: 'QBX Hub',
  outlet: 'Розетка',
  electrical_panel: 'Щит',
};

export type CreatePlacementInput = Partial<MapPlacement> & Pick<MapPlacement, 'kind'>;
export type UpdateSpaceMapInput = Partial<Omit<SpaceMap, 'spaceId' | 'schemaVersion'>>;

export interface SpaceGeometryPlacement {
  kind: MapObjectKind;
  xM: number;
  yM: number;
  zM?: number;
  zoneId?: string;
  plantId?: string;
  sensorId?: string;
  outputId?: string;
  deviceId?: string;
  parentId?: string;
  role?: string;
  mounting?: MapMounting;
  catalogId?: string;
}

export interface SpaceGeometrySnapshot {
  lengthM: number;
  widthM: number;
  heightM?: number;
  zoneCount: number;
  placementCount: number;
  placements: SpaceGeometryPlacement[];
}
