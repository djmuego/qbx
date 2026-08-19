export type GrowMedium =
  | 'soil'
  | 'coco'
  | 'rockwool'
  | 'hydroponics'
  | 'aeroponics'
  | 'other'
  | 'unknown';

export interface CropProfile {
  cropId: string;
  commonName: string;
  scientificName?: string;
  cultivar?: string;
  medium?: GrowMedium;
  startedAt?: string;
  notes?: string;
}

export function createEmptyCropProfile(): CropProfile | null {
  return null;
}
