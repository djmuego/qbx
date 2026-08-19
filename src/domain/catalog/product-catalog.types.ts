export type ProductLine = 'strip' | 'hub' | 'power' | 'sense' | 'climate' | 'water';

export interface DeviceProductMeta {
  sku: string;
  line: ProductLine;
  /** Shown in store / add-device — consumer can buy & download app */
  consumerReady: boolean;
  purchaseUrl?: string;
  datasheetUrl?: string;
  /** Sort order in catalog (lower = first) */
  sortOrder?: number;
}

export interface ProductCatalogEntry extends DeviceProductMeta {
  modelId: string;
}
