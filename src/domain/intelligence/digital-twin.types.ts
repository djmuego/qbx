import type { GrowRun } from '../grow/grow-run.types';
import type { CropProfile } from '../grow/crop-profile.types';
import type { SpaceGeometrySnapshot } from '../map/space-map.types';

/** Unified space representation for Intelligence Layer — not physics simulation */
export interface SpaceDigitalTwin {
  spaceId: string;
  spaceName: string;
  growRun?: GrowRun | null;
  cropProfile?: CropProfile | null;
  environmentType?: 'grow_tent' | 'greenhouse' | 'indoor_room' | 'outdoor' | 'unknown';
  zoneCount: number;
  sensorCount: number;
  equipmentCount: number;
  automationCount: number;
  hasLiveTelemetry: boolean;
  dataQualityScore: number;
  capturedAtMs: number;
  geometry?: SpaceGeometrySnapshot;
}
