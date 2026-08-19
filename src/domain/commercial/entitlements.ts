import type { FeatureKey, SubscriptionContext } from './subscription.types';
import { FREE_MAX_SPACES } from './subscription.types';

export function hasProAccess(sub: SubscriptionContext): boolean {
  if (sub.hubLifetime) return true;

  const trialActive =
    sub.status === 'trialing' &&
    sub.trialEndsAt != null &&
    sub.trialEndsAt.getTime() > Date.now();

  if (trialActive) return true;

  if (sub.tier === 'pro' || sub.tier === 'enterprise') {
    return sub.status === 'active' || sub.status === 'past_due' || sub.status === 'trialing';
  }

  return false;
}

export class EntitlementsService {
  static hasProAccess(sub: SubscriptionContext): boolean {
    return hasProAccess(sub);
  }

  static isFeatureAvailable(feature: FeatureKey, sub: SubscriptionContext): boolean {
    if (hasProAccess(sub)) return true;

    switch (feature) {
      case '3D_DIGITAL_TWIN':
      case 'AI_GROW_ADVISOR':
      case 'UNLIMITED_SPACES':
      case 'CLOUD_GROW_JOURNAL':
      case 'EXTERNAL_HUB_INTEGRATION':
      case 'SPATIAL_HEATMAP':
      case 'SPATIAL_INTELLIGENCE':
        return false;
      default:
        return false;
    }
  }

  static getMaxSpaces(sub: SubscriptionContext): number {
    return this.isFeatureAvailable('UNLIMITED_SPACES', sub) ? 999 : FREE_MAX_SPACES;
  }

  static canAddSpace(currentSpaceCount: number, sub: SubscriptionContext): boolean {
    return currentSpaceCount < this.getMaxSpaces(sub);
  }

  static hasFullCloudJournal(sub: SubscriptionContext): boolean {
    return this.isFeatureAvailable('CLOUD_GROW_JOURNAL', sub);
  }
}

// Re-export constant for tests
export { FREE_MAX_SPACES } from './subscription.types';
