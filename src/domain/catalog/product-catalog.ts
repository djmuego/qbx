import type { ProductCatalogEntry } from './product-catalog.types';
import { productDatasheetUrl, productPurchaseUrl, storeStripLineUrl } from '../../config/commerce.config';

/** Commercial SKU registry — scales independently from firmware catalog */
export const PRODUCT_CATALOG: ProductCatalogEntry[] = [
  {
    modelId: 'qbx-strip-4',
    sku: 'QBX-STRIP-4',
    line: 'strip',
    consumerReady: true,
    sortOrder: 10,
    purchaseUrl: productPurchaseUrl('strip-4'),
    datasheetUrl: productDatasheetUrl('strip-4'),
  },
  {
    modelId: 'qbx-hub',
    sku: 'QBX-HUB',
    line: 'hub',
    consumerReady: true,
    sortOrder: 20,
    purchaseUrl: productPurchaseUrl('hub'),
    datasheetUrl: productDatasheetUrl('hub'),
  },
  {
    modelId: 'qbx-power-4',
    sku: 'QBX-PWR-4',
    line: 'power',
    consumerReady: false,
    sortOrder: 30,
  },
  {
    modelId: 'qbx-power-4x',
    sku: 'QBX-PWR-4X',
    line: 'power',
    consumerReady: false,
    sortOrder: 40,
  },
  {
    modelId: 'qbx-power-8',
    sku: 'QBX-PWR-8',
    line: 'power',
    consumerReady: false,
    sortOrder: 50,
  },
  {
    modelId: 'qbx-sense',
    sku: 'QBX-SENSE',
    line: 'sense',
    consumerReady: true,
    sortOrder: 60,
    purchaseUrl: productPurchaseUrl('sense'),
    datasheetUrl: productDatasheetUrl('sense'),
  },
  {
    modelId: 'qbx-climate',
    sku: 'QBX-CLIMATE',
    line: 'climate',
    consumerReady: false,
    sortOrder: 70,
  },
  {
    modelId: 'qbx-water',
    sku: 'QBX-WATER',
    line: 'water',
    consumerReady: false,
    sortOrder: 80,
  },
];

export function productMetaForModel(modelId: string): ProductCatalogEntry | undefined {
  return PRODUCT_CATALOG.find((p) => p.modelId === modelId);
}

export function consumerProductModelIds(): string[] {
  return PRODUCT_CATALOG.filter((p) => p.consumerReady)
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
    .map((p) => p.modelId);
}

export function stripLineStoreUrl(): string {
  return storeStripLineUrl();
}
