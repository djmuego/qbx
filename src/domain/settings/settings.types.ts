import type { GrowPhaseId } from '../grow/grow-phase.types';
import type { TempUnit, ThemeMode } from '../space/space.types';

export interface AppSettings {
  theme: ThemeMode;
  tempUnit: TempUnit;
  growPhase: GrowPhaseId;
  currentSpaceId: string;
  mapViewMode?: '2d' | '3d';
}

export type UpdateSettingsInput = Partial<AppSettings>;
