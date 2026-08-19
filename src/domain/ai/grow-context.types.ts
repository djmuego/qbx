/** How a value entered the Grow Agent reasoning chain. */
export type DataKind = 'FACT' | 'DERIVED' | 'INFERENCE' | 'RECOMMENDATION' | 'UNKNOWN';

export type DataQuality = 'fresh' | 'stale' | 'missing' | 'error';

export type DataSource = 'hardware' | 'simulator' | 'unknown';

export interface GrowContextMeta {
  capturedAtMs: number;
  promptVersion: string;
  dataSource: DataSource;
  runtimeMode: 'hardware' | 'simulator';
  agentMode: 'observe' | 'advise' | 'assist';
}

export interface GrowContextSpace {
  id: string;
  name: string;
  type?: string;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  areaM2?: number;
  volumeM3?: number;
  timezone?: string;
  description?: string;
  geometry?: import('../map/space-map.types').SpaceGeometrySnapshot;
}

export interface GrowContextPlant {
  id: string;
  name: string;
  cultivar?: string;
  potVolumeL?: number;
  medium?: string;
  plantedAt?: string;
  zoneId?: string;
  growRunId?: string;
}

export interface GrowContextCrop {
  cropId?: string;
  commonName?: string;
  scientificName?: string;
  cultivar?: string;
  medium?: string;
  startedAt?: string;
  notes?: string;
  dataKind: DataKind;
}

export interface GrowContextStage {
  stageId: string;
  stageName: string;
  legacyGrowPhase: string;
  dataKind: DataKind;
}

export interface SensorObservation {
  id: string;
  name: string;
  type: string;
  available: boolean;
  value: number | null;
  unit: string;
  quality: DataQuality;
  timestampMs: number | null;
  optimalMin?: number;
  optimalMax?: number;
  status?: string;
  dataKind: DataKind;
  deviceId: string;
  deviceOnline: boolean;
}

export interface TelemetryWindowSummary {
  window: '15m' | '1h' | '6h' | '24h' | '7d';
  sampleCount: number;
  current: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  trend: 'rising' | 'falling' | 'stable' | 'unknown';
  rateOfChange?: number | null;
  timeOutsideTargetMinutes?: number | null;
  dataKind: DataKind;
}

export interface SensorTelemetrySummary {
  sensorId: string;
  sensorType: string;
  windows: TelemetryWindowSummary[];
}

export interface DerivedMetric {
  id: 'vpd' | 'dli' | 'dew_point';
  label: string;
  value: number | null;
  unit: string;
  available: boolean;
  quality: DataQuality;
  dataKind: DataKind;
  inputs: string[];
}

export interface EquipmentContextItem {
  deviceId: string;
  deviceName: string;
  outputId: string;
  name: string;
  type: string;
  role?: string;
  reportedState: boolean | null;
  controlMode: 'auto' | 'manual' | 'unknown';
  deviceOnline: boolean;
  activeAutomationName?: string;
  dataKind: DataKind;
}

export interface AutomationContextItem {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  runtimeStatus?: string;
  conditionSummary: string;
  actionSummary: string;
  dataKind: DataKind;
}

export interface GrowContextEvent {
  id: string;
  type: string;
  timestampMs: number;
  message: string;
  deviceId?: string;
  sensorId?: string;
  outputId?: string;
  automationId?: string;
  dataKind: DataKind;
}

export interface GrowContextDataQuality {
  hasSpace: boolean;
  hasDevices: boolean;
  hasLiveSensorData: boolean;
  hasOutputs: boolean;
  hasAutomations: boolean;
  hasCropProfile: boolean;
  hasGrowRun: boolean;
  missingSensors: string[];
  staleSensors: string[];
  offlineDevices: number;
  confidenceHint: 'high' | 'medium' | 'low';
}

export interface GrowContext {
  meta: GrowContextMeta;
  space: GrowContextSpace | null;
  crop: GrowContextCrop;
  growStage: GrowContextStage;
  growRun: {
    id?: string;
    commonName?: string;
    startedAt?: string;
    dataKind: DataKind;
  };
  environment: {
    sensors: SensorObservation[];
    derivedMetrics: DerivedMetric[];
    telemetrySummary: SensorTelemetrySummary[];
  };
  substrate: {
    soilMoistureSensors: SensorObservation[];
  };
  lighting: {
    lightSensors: SensorObservation[];
    photoperiodHint?: string;
  };
  irrigation: {
    waterLevelSensors: SensorObservation[];
    wateringOutputs: EquipmentContextItem[];
  };
  equipment: EquipmentContextItem[];
  automations: AutomationContextItem[];
  alerts: {
    emergencyActive: boolean;
    dataKind: DataKind;
  };
  targets: import('../grow/grow-targets.types').GrowTargets;
  recentEvents: GrowContextEvent[];
  userNotes?: string;
  plants?: GrowContextPlant[];
  dataQuality: GrowContextDataQuality;
  spatialTwin?: {
    scale?: import('../map/spatial-hierarchy').SpatialScale;
    roomDimensions?: { lengthM: number; widthM: number; heightM: number };
    plants: Array<{ id: string; name?: string; xM: number; yM: number; zM: number }>;
    plantGroups: Array<{ id: string; name: string; count: number }>;
    equipmentPositions: Array<{ id: string; role?: string; xM: number; yM: number; zM: number }>;
    sensorPositions: Array<{ id: string; xM: number; yM: number; zM: number }>;
    lightPositions: Array<{ id: string; xM: number; yM: number; zM: number }>;
    irrigationPositions: Array<{ id: string; xM: number; yM: number; zM: number }>;
    zones: Array<{ id: string; name: string }>;
    relationships?: import('../map/space-map.types').SpatialRelationship[];
    mounting?: Array<{ id: string; mounting?: string; zM: number }>;
    electrical?: { totalRatedW: number | null; linkCount: number; disclaimer: string };
  };
}
