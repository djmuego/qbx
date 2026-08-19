import { EntitlementsService } from '../../domain/commercial/entitlements';
import type { SubscriptionContext } from '../../domain/commercial/subscription.types';
import { FREE_CLOUD_HISTORY_DAYS } from '../../domain/commercial/subscription.types';
import type { GrowJournalEntry } from '../../domain/grow/grow-journal.types';

export interface JournalRetentionContext {
  subscription: SubscriptionContext | null;
  enforced: boolean;
}

let retentionCtx: JournalRetentionContext = { subscription: null, enforced: false };

export function setJournalRetentionContext(ctx: JournalRetentionContext): void {
  retentionCtx = ctx;
}

export function getJournalRetentionContext(): JournalRetentionContext {
  return retentionCtx;
}

export function hasFullCloudJournal(ctx: JournalRetentionContext = retentionCtx): boolean {
  if (!ctx.enforced) return true;
  if (!ctx.subscription) return false;
  return EntitlementsService.isFeatureAvailable('CLOUD_GROW_JOURNAL', ctx.subscription);
}

export function applyJournalRetention(
  entries: GrowJournalEntry[],
  ctx: JournalRetentionContext = retentionCtx,
): GrowJournalEntry[] {
  if (hasFullCloudJournal(ctx)) return entries;
  const cutoffMs = Date.now() - FREE_CLOUD_HISTORY_DAYS * 86_400_000;
  return entries.filter((entry) => entry.timestampMs >= cutoffMs);
}

export function cloudHistoryRetentionLabel(ctx: JournalRetentionContext = retentionCtx): string {
  if (hasFullCloudJournal(ctx)) return 'unlimited';
  return `${FREE_CLOUD_HISTORY_DAYS}d`;
}
