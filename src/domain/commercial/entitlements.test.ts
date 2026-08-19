import { describe, expect, it } from 'vitest';
import { EntitlementsService, hasProAccess } from './entitlements';
import type { SubscriptionContext } from './subscription.types';

function ctx(partial: Partial<SubscriptionContext> & Pick<SubscriptionContext, 'tier' | 'status'>): SubscriptionContext {
  return {
    trialEndsAt: null,
    currentPeriodEnd: null,
    hubLifetime: false,
    ...partial,
  };
}

describe('EntitlementsService', () => {
  it('grants pro during active trial on free tier', () => {
    const sub = ctx({
      tier: 'free',
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + 7 * 86400000),
    });
    expect(hasProAccess(sub)).toBe(true);
    expect(EntitlementsService.isFeatureAvailable('3D_DIGITAL_TWIN', sub)).toBe(true);
  });

  it('denies pro features after trial expires on free tier', () => {
    const sub = ctx({
      tier: 'free',
      status: 'trialing',
      trialEndsAt: new Date(Date.now() - 1000),
    });
    expect(hasProAccess(sub)).toBe(false);
    expect(EntitlementsService.isFeatureAvailable('AI_GROW_ADVISOR', sub)).toBe(false);
  });

  it('grants all features for active pro', () => {
    const sub = ctx({ tier: 'pro', status: 'active' });
    expect(EntitlementsService.getMaxSpaces(sub)).toBe(999);
    expect(EntitlementsService.isFeatureAvailable('EXTERNAL_HUB_INTEGRATION', sub)).toBe(true);
  });

  it('limits free tier to one space', () => {
    const sub = ctx({ tier: 'free', status: 'canceled' });
    expect(EntitlementsService.getMaxSpaces(sub)).toBe(1);
    expect(EntitlementsService.canAddSpace(1, sub)).toBe(false);
    expect(EntitlementsService.canAddSpace(0, sub)).toBe(true);
  });

  it('hub lifetime unlocks pro', () => {
    const sub = ctx({ tier: 'free', status: 'canceled', hubLifetime: true });
    expect(EntitlementsService.isFeatureAvailable('UNLIMITED_SPACES', sub)).toBe(true);
  });
});
