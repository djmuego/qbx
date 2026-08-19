export type NavigationTab = 'home' | 'automations' | 'devices' | 'map' | 'account' | 'settings';

export type ThemeMode = 'light' | 'dark' | 'system';

export type TempUnit = 'C' | 'F';

export type SpaceType =
  | 'greenhouse'
  | 'grow_tent'
  | 'grow_box'
  | 'grow_room'
  | 'hydroponics'
  | 'seedling_area'
  | 'outdoor'
  | 'facility'
  | 'site'
  | 'custom';

export interface SpaceDimensions {
  lengthM: number;
  widthM: number;
  heightM: number;
}

export interface Space {
  id: string;
  name: string;
  description?: string;
  type?: SpaceType;
  dimensions?: SpaceDimensions;
  areaM2?: number;
  volumeM3?: number;
  timezone?: string;
  isDefault?: boolean;
  deviceIds?: string[];
  /** Parent space in Site → Building → Floor → Room. */
  parentId?: string;
  spatialScale?: import('../map/spatial-hierarchy').SpatialScale;
  spatialKind?: import('../map/spatial-hierarchy').SpatialNodeKind;
  /** Origin of this space inside the parent frame (meters). */
  localOrigin?: { xM: number; yM: number; zM: number };
}

export type CreateSpaceInput = Pick<Space, 'name' | 'description' | 'type' | 'dimensions' | 'timezone'> &
  Partial<Pick<Space, 'parentId' | 'spatialScale' | 'spatialKind' | 'localOrigin'>>;
export type UpdateSpaceInput = Partial<
  Pick<
    Space,
    | 'name'
    | 'description'
    | 'type'
    | 'dimensions'
    | 'areaM2'
    | 'volumeM3'
    | 'timezone'
    | 'parentId'
    | 'spatialScale'
    | 'spatialKind'
    | 'localOrigin'
  >
>;

export function computeSpaceMetrics(dimensions: SpaceDimensions): { areaM2: number; volumeM3: number } {
  const areaM2 = Number((dimensions.lengthM * dimensions.widthM).toFixed(2));
  const volumeM3 = Number((areaM2 * dimensions.heightM).toFixed(2));
  return { areaM2, volumeM3 };
}

/** Dimensions already belong to the Space. Infer only for legacy fixtures without them. */
export function inferSpaceDimensions(space: Pick<Space, 'id' | 'name' | 'isDefault' | 'type'>): SpaceDimensions {
  const name = space.name.toLowerCase();
  if (space.id === 'space-2' || /80\s*[x×]\s*80/.test(name) || space.type === 'grow_tent' || space.type === 'grow_box') {
    return { lengthM: 0.8, widthM: 0.8, heightM: 1.8 };
  }
  if (space.id === 'space-3' || /рассад/.test(name) || space.type === 'seedling_area') {
    return { lengthM: 1.5, widthM: 0.8, heightM: 0.6 };
  }
  return { lengthM: 4, widthM: 6, heightM: 2.8 };
}

export function withSpaceDimensions(space: Space): Space {
  if (space.dimensions && space.dimensions.lengthM > 0 && space.dimensions.widthM > 0) {
    const metrics = computeSpaceMetrics(space.dimensions);
    return { ...space, ...metrics };
  }
  const dimensions = inferSpaceDimensions(space);
  return { ...space, dimensions, ...computeSpaceMetrics(dimensions) };
}

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  greenhouse: 'Теплица',
  grow_tent: 'Гроутент',
  grow_box: 'Гроубокс',
  grow_room: 'Гроурум',
  hydroponics: 'Гидропоника',
  seedling_area: 'Зона рассады',
  outdoor: 'Улица',
  facility: 'Комплекс',
  site: 'Территория',
  custom: 'Другое',
};
