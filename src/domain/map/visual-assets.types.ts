/** Visual presentation only. Never SpatialObject identity, agronomy FACT, or hardware state. */

export type SpatialAssetRenderType = 'sprite' | 'model' | 'procedural';

export type SpatialAssetCategory =
  | 'plants'
  | 'lighting'
  | 'climate'
  | 'sensors'
  | 'irrigation'
  | 'infrastructure'
  | 'electrical'
  | 'qbx'
  | 'cameras'
  | 'misc';

export type SpatialAssetAnchor = 'bottom-center' | 'center' | 'top-center';

export type SpatialBillboardMode =
  | 'camera-facing'
  | 'vertical-billboard'
  | 'cross-billboard'
  | 'fixed-orientation'
  | 'surface-mounted';

export type SpatialAssetId = string;

export interface SpatialAssetScale {
  widthM: number;
  heightM: number;
  depthM: number;
}

export interface SpatialAssetDescriptor {
  id: SpatialAssetId;
  category: SpatialAssetCategory;
  source?: string;
  glbUrl?: string;
  renderType: SpatialAssetRenderType;
  defaultScale: SpatialAssetScale;
  anchor: SpatialAssetAnchor;
  defaultHeightM: number;
  billboard: SpatialBillboardMode;
  mobileLod: 'sprite' | 'model' | 'procedural';
  /** Source pack filename under /img — documentation only. */
  packFile?: string;
  /** When false, registered but never auto-resolved onto placements (composite photos). */
  objectSprite: boolean;
  /** Sprite already includes pot/container — skip procedural pot mesh. */
  includesContainer?: boolean;
  /** Width / height aspect ratio for contain-fit scaling. */
  aspectRatio?: number;
}

/** @deprecated Prefer SpatialAssetDescriptor — kept for Pass 1 tests. */
export type VisualAssetId =
  | 'plant'
  | 'pot'
  | 'growLight'
  | 'exhaustFan'
  | 'circulationFan'
  | 'sensor'
  | 'camera'
  | 'tank'
  | 'pump'
  | 'hub'
  | 'hvac';

export interface VisualAssetDescriptor {
  id: VisualAssetId;
  render: SpatialAssetRenderType | 'glb';
  proceduralKey: VisualAssetId;
  glbUrl?: string;
}
