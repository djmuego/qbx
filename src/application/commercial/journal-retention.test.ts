import { describe, expect, it } from 'vitest';
import { applyJournalRetention, hasFullCloudJournal } from './journal-retention';
import type { GrowJournalEntry } from '../../domain/grow/grow-journal.types';

function entry(daysAgo: number): GrowJournalEntry {
  return {
    id: `e-${daysAgo}`,
    spaceId: 'space-1',
    kind: 'note',
    title: 't',
    body: 'b',
    timestampMs: Date.now() - daysAgo * 86_400_000,
  };
}

describe('journal-retention', () => {
  it('keeps all entries when commerce off', () => {
    const entries = [entry(10), entry(1)];
    expect(applyJournalRetention(entries, { subscription: null, enforced: false })).toHaveLength(2);
    expect(hasFullCloudJournal({ subscription: null, enforced: false })).toBe(true);
  });

  it('trims entries older than 3 days on free tier', () => {
    const entries = [entry(10), entry(4), entry(0)];
    const result = applyJournalRetention(entries, {
      enforced: true,
      subscription: { tier: 'free', status: 'canceled', trialEndsAt: null },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e-0');
  });

  it('keeps full history on pro', () => {
    const entries = [entry(30)];
    const result = applyJournalRetention(entries, {
      enforced: true,
      subscription: { tier: 'pro', status: 'active', trialEndsAt: null },
    });
    expect(result).toHaveLength(1);
  });
});
