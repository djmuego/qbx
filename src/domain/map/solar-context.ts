/** Orientation foundation for future solar / wind analysis — no simulation in V1. */
export interface SolarContext {
  latitude?: number;
  longitude?: number;
  northAngleDeg: number;
  dateIso?: string;
  timeLocal?: string;
  /** Future computed fields — not populated in Outdoor Pass V1. */
  sunAzimuthDeg?: number;
  sunElevationDeg?: number;
}

export function buildSolarContext(northAngleDeg = 0, partial?: Partial<SolarContext>): SolarContext {
  return {
    northAngleDeg,
    ...partial,
  };
}
