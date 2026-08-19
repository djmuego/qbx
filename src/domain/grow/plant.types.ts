export type PlantMedium = 'coco' | 'soil' | 'hydro' | 'other';

export type PlantGrowthMode = 'auto' | 'manual';

export interface Plant {
  id: string;
  spaceId: string;
  growRunId?: string;
  zoneId?: string;
  name: string;
  cultivar?: string;
  potVolumeL?: number;
  medium?: PlantMedium;
  plantedAt?: string;
  growthMode?: PlantGrowthMode;
  notes?: string;
  crop?: string;
  canopyDiameterM?: number;
  plantHeightM?: number;
}

export interface PlantGroup {
  id: string;
  spaceId: string;
  name: string;
  plantIds: string[];
  zoneId?: string;
}

export type CreatePlantInput = Pick<Plant, 'spaceId' | 'name'> &
  Partial<Omit<Plant, 'id' | 'spaceId' | 'name'>>;

export type UpdatePlantInput = Partial<Omit<Plant, 'id' | 'spaceId'>>;

export type CreatePlantGroupInput = Pick<PlantGroup, 'spaceId' | 'name'> &
  Partial<Omit<PlantGroup, 'id' | 'spaceId' | 'name'>>;

export type UpdatePlantGroupInput = Partial<Omit<PlantGroup, 'id' | 'spaceId'>>;

export interface PlantStoreSnapshot {
  plants: Plant[];
  groups: PlantGroup[];
}

export const PLANT_MEDIUM_LABELS: Record<PlantMedium, string> = {
  coco: 'Coco',
  soil: 'Почва',
  hydro: 'Гидропоника',
  other: 'Другое',
};
