import type { MapPlacement } from './space-map.types';

export interface EstimatedFootprint {
  kind: 'ESTIMATED';
  widthM: number;
  depthM: number;
  ppfd?: undefined;
}

/** Geometric footprint only. Never invents PPFD. */
export function estimatedLightFootprint(light: MapPlacement): EstimatedFootprint {
  return {
    kind: 'ESTIMATED',
    widthM: light.coverageWidthM ?? light.widthM * 1.15,
    depthM: light.coverageDepthM ?? light.heightM * 1.15,
  };
}

export function sensorCoverageRadiusM(): number {
  return 1.2;
}
