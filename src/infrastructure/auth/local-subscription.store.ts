import type { WorkspaceSubscription, SubscriptionTier, SubscriptionStatus } from '../../domain/commercial/subscription.types';
import { TRIAL_DAYS } from '../../domain/commercial/subscription.types';

const KEY = 'qbx_local_subscriptions_v1';

function readAll(): Record<string, WorkspaceSubscription> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, WorkspaceSubscription>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, WorkspaceSubscription>): void {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export function getLocalWorkspaceSubscription(workspaceId: string): WorkspaceSubscription {
  const existing = readAll()[workspaceId];
  if (existing) return existing;
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
  const created: WorkspaceSubscription = {
    workspaceId,
    tier: 'free',
    status: 'trialing',
    trialEndsAt: trialEnds.toISOString(),
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    hubLifetime: false,
  };
  writeAll({ ...readAll(), [workspaceId]: created });
  return created;
}

export function ensureLocalWorkspaceSubscription(workspaceId: string): void {
  getLocalWorkspaceSubscription(workspaceId);
}

export function setLocalHubLifetime(workspaceId: string, enabled: boolean): void {
  const current = getLocalWorkspaceSubscription(workspaceId);
  writeAll({ ...readAll(), [workspaceId]: { ...current, hubLifetime: enabled } });
}

export function setLocalAdminSubscription(
  workspaceId: string,
  opts: { tier?: SubscriptionTier; status?: SubscriptionStatus; extendTrialDays?: number; trialEndsAt?: string | null },
): void {
  const current = getLocalWorkspaceSubscription(workspaceId);
  let trialEndsAt = current.trialEndsAt;
  if (opts.trialEndsAt !== undefined) {
    trialEndsAt = opts.trialEndsAt;
  } else if (opts.extendTrialDays && opts.extendTrialDays > 0) {
    const base = trialEndsAt ? new Date(trialEndsAt) : new Date();
    base.setDate(base.getDate() + opts.extendTrialDays);
    trialEndsAt = base.toISOString();
  }
  writeAll({
    ...readAll(),
    [workspaceId]: {
      ...current,
      tier: opts.tier ?? current.tier,
      status: opts.status ?? current.status,
      trialEndsAt,
    },
  });
}
