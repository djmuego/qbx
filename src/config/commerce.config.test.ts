import { describe, expect, it } from 'vitest';
import { isCommerceEnforced, isStripeConfigured, productPurchaseUrl, QBX_STORE_BASE } from './commerce.config';

describe('commerce.config', () => {
  it('builds product purchase URLs from store base', () => {
    expect(productPurchaseUrl('strip-4')).toBe(`${QBX_STORE_BASE}/products/strip-4`);
  });

  it('disables commerce enforcement in simulator mode', () => {
    expect(isCommerceEnforced()).toBe(false);
  });

  it('reports stripe not configured without price ids in test env', () => {
    expect(isStripeConfigured()).toBe(false);
  });
});
