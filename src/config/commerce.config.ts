/** Commerce URLs — override via Vite env for production storefront */

import { isSimulatorMode } from './runtime-mode';
import { dataBackendMode, isAuthRequired, isSupabaseConfigured } from '../infrastructure/supabase/config';

const trimSlash = (url: string) => url.replace(/\/$/, '');

export const QBX_STORE_BASE = trimSlash(
  import.meta.env.VITE_QBX_STORE_URL ?? 'https://shop.quantumbotanix.com',
);

export const QBX_DOCS_BASE = trimSlash(
  import.meta.env.VITE_QBX_DOCS_URL ?? 'https://docs.quantumbotanix.com',
);

export function productPurchaseUrl(slug: string): string {
  return `${QBX_STORE_BASE}/products/${slug}`;
}

export function productDatasheetUrl(slug: string): string {
  return `${QBX_DOCS_BASE}/devices/${slug}`;
}

export function storeStripLineUrl(): string {
  return `${QBX_STORE_BASE}/collections/strips`;
}

/** When false, all Pro features unlocked (dev:sim, local, or VITE_QBX_COMMERCE_MODE=off). */
export function isCommerceEnforced(): boolean {
  const mode = import.meta.env.VITE_QBX_COMMERCE_MODE as string | undefined;
  if (mode === 'off') return false;
  if (isSimulatorMode()) return false;
  if (!isAuthRequired()) return false;
  return dataBackendMode() === 'supabase' && isSupabaseConfigured();
}

export const STRIPE_PRO_MONTHLY_PRICE_ID =
  (import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID as string | undefined) ?? '';

export const STRIPE_PRO_YEARLY_PRICE_ID =
  (import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID as string | undefined) ?? '';

export const QBX_PRO_MONTHLY_USD = 9.99;
export const QBX_PRO_YEARLY_USD = 99;
