export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export interface WorkspaceSubscription {
  workspaceId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  hubLifetime: boolean;
}

export interface SubscriptionContext {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  hubLifetime?: boolean;
}

export type FeatureKey =
  | '3D_DIGITAL_TWIN'
  | 'AI_GROW_ADVISOR'
  | 'UNLIMITED_SPACES'
  | 'CLOUD_GROW_JOURNAL'
  | 'EXTERNAL_HUB_INTEGRATION'
  | 'SPATIAL_HEATMAP'
  | 'SPATIAL_INTELLIGENCE';

export const PRO_FEATURES: FeatureKey[] = [
  '3D_DIGITAL_TWIN',
  'AI_GROW_ADVISOR',
  'UNLIMITED_SPACES',
  'CLOUD_GROW_JOURNAL',
  'EXTERNAL_HUB_INTEGRATION',
  'SPATIAL_HEATMAP',
  'SPATIAL_INTELLIGENCE',
];

export const FREE_MAX_SPACES = 1;
export const FREE_CLOUD_HISTORY_DAYS = 3;
export const TRIAL_DAYS = 14;
