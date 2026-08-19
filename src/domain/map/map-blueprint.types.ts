export type HardwareOrigin = 'existing' | 'recommended';

export type PlacementBasis = 'GEOMETRY_BASED' | 'TELEMETRY_BASED' | 'KNOWLEDGE_BASED' | 'MIXED';

export type BlueprintConfidence = 'high' | 'medium' | 'low';

export interface BlueprintPosition {
  xM: number;
  yM: number;
  zM?: number;
}

export interface MapBlueprintObject {
  id: string;
  type: import('./space-map.types').MapObjectKind;
  name: string;
  role?: string;
  suggestedPosition: BlueprintPosition;
  dimensions: { widthM: number; heightM: number };
  rotationDeg: number;
  zone?: string;
  count?: number;
  origin: HardwareOrigin;
}

export interface MapBlueprintZone {
  name: string;
  xM: number;
  yM: number;
  widthM: number;
  heightM: number;
}

export interface MapBlueprintPlantGroup {
  name: string;
  count: number;
  crop?: string;
  zone?: string;
  position: BlueprintPosition;
  dimensions?: { widthM: number; heightM: number };
  /** Days since planting for this group */
  ageDays?: number;
}

export interface MapBlueprintRelationship {
  from: string;
  to: string;
  kind: string;
}

export interface RecommendedHardware {
  type: string;
  role?: string;
  reason: string;
}

export interface MapBlueprint {
  schemaVersion: 1;
  spaceGeometry: { lengthM: number; widthM: number; heightM: number };
  zones: MapBlueprintZone[];
  objects: MapBlueprintObject[];
  plantGroups: MapBlueprintPlantGroup[];
  relationships: MapBlueprintRelationship[];
  assumptions: string[];
  questions: string[];
  confidence: BlueprintConfidence;
  recommendedHardware: RecommendedHardware[];
  /** Default plant age when groups omit ageDays */
  defaultPlantAgeDays?: number;
}

export interface BlueprintValidationIssue {
  code: string;
  message: string;
}

export interface BlueprintValidationResult {
  ok: boolean;
  issues: BlueprintValidationIssue[];
}

export interface LayoutPreview {
  map: import('./space-map.types').SpaceMap;
  plants: import('../grow/plant.types').Plant[];
  groups: import('../grow/plant.types').PlantGroup[];
}
