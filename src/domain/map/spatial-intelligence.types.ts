export type SpatialInsightKind =
  | 'sensor_coverage'
  | 'sensor_distribution'
  | 'zone_without_sensor'
  | 'plant_without_nearby_sensor'
  | 'device_offline'
  | 'zone_temperature_difference'
  | 'equipment_no_effect'
  | 'placement_recommendation'
  | 'data_gap'
  | 'layout_issue';

export type SpatialDataKind = 'FACT' | 'DERIVED' | 'INTERPOLATED' | 'AI_INFERENCE' | 'UNKNOWN';

export interface SpatialInsight {
  kind: SpatialInsightKind;
  title: string;
  detail: string;
  dataKind: SpatialDataKind;
  basis?: import('./map-blueprint.types').PlacementBasis;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  zoneId?: string;
  suggestedPosition?: { xM: number; yM: number };
}

export interface SpatialContext {
  coverageLabel: 'Хорошее' | 'Требует внимания' | 'Недостаточно данных';
  insightCount: number;
  insights: SpatialInsight[];
  zoneSummaries: Array<{
    zoneId: string;
    name: string;
    plantCount: number;
    sensorCount: number;
    avgTemperatureC?: number | null;
    avgRhPercent?: number | null;
    temperatureKind: SpatialDataKind;
  }>;
  bounds?: { lengthM: number; widthM: number; heightM: number };
  scale?: import('./spatial-hierarchy').SpatialScale;
  plants?: Array<{ id: string; xM: number; yM: number; zM: number }>;
  equipmentPositions?: Array<{ id: string; xM: number; yM: number; zM: number }>;
  sensorPositions?: Array<{ id: string; xM: number; yM: number; zM: number }>;
  mounting?: Array<{ id: string; mounting?: string; zM: number }>;
  relationships?: import('./space-map.types').SpatialRelationship[];
  liveReadings?: Array<{ placementId: string; value: string }>;
  environmentType?: import('./environment.types').EnvironmentType;
  terrain?: import('./terrain.types').TerrainProfile;
  northAngleDeg?: number;
  bedCount?: number;
  rowCount?: number;
  pathCount?: number;
  structureCount?: number;
  outdoorSensorPositions?: Array<{ id: string; xM: number; yM: number; role?: string }>;
  weatherStationId?: string;
  childSpaceIds?: string[];
  solar?: import('./solar-context').SolarContext;
}

export interface HeatmapPoint {
  xM: number;
  yM: number;
  value: number;
  sensorId: string;
  label: string;
}

export interface HeatmapResult {
  metric: 'temperature' | 'humidity' | 'vpd';
  available: boolean;
  reason?: string;
  dataKind: SpatialDataKind;
  measured: HeatmapPoint[];
  interpolationNote?: string;
}

export interface SpatialEffectObservation {
  id: string;
  spaceId: string;
  action: string;
  equipmentId: string;
  affectedSensorIds: string[];
  before: Record<string, number | null>;
  after: Record<string, number | null>;
  durationMs: number;
  context: string;
  confidence: 'high' | 'medium' | 'low';
  timestamp: string;
}
