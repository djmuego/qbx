import type { SubscriptionContext, SubscriptionStatus, SubscriptionTier, WorkspaceSubscription } from '../../domain/commercial/subscription.types';

export function subscriptionToContext(sub: WorkspaceSubscription): SubscriptionContext {
  return {
    tier: sub.tier,
    status: sub.status,
    trialEndsAt: sub.trialEndsAt ? new Date(sub.trialEndsAt) : null,
    currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
    hubLifetime: sub.hubLifetime,
  };
}

export function parseSubscriptionRow(raw: Record<string, unknown>, workspaceId: string): WorkspaceSubscription {
  return {
    workspaceId: String(raw.workspaceId ?? workspaceId),
    tier: String(raw.tier ?? 'free') as SubscriptionTier,
    status: String(raw.status ?? 'trialing') as SubscriptionStatus,
    trialEndsAt: (raw.trialEndsAt as string | null) ?? null,
    currentPeriodStart: (raw.currentPeriodStart as string | null) ?? null,
    currentPeriodEnd: (raw.currentPeriodEnd as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd),
    stripeCustomerId: (raw.stripeCustomerId as string | null) ?? null,
    hubLifetime: Boolean(raw.hubLifetime),
  };
}

export const UNLOCKED_SUBSCRIPTION_CONTEXT: SubscriptionContext = {
  tier: 'pro',
  status: 'active',
  trialEndsAt: null,
  currentPeriodEnd: null,
  hubLifetime: false,
};
