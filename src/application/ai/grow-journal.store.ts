import { applyJournalRetention } from '../commercial/journal-retention';
import type { GrowJournalEntry, GrowJournalEntryKind } from '../../domain/grow/grow-journal.types';

const STORAGE_KEY = 'qbx_grow_journal_v1';
const MAX_ENTRIES = 100;

function key(spaceId: string) {
  return `${STORAGE_KEY}_${spaceId}`;
}

export function loadGrowJournal(spaceId: string): GrowJournalEntry[] {
  if (!spaceId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key(spaceId));
    const parsed = raw ? (JSON.parse(raw) as GrowJournalEntry[]) : [];
    return applyJournalRetention(parsed);
  } catch {
    return [];
  }
}

export function appendGrowJournalEntry(
  spaceId: string,
  entry: Omit<GrowJournalEntry, 'id' | 'spaceId' | 'timestampMs'> & { timestampMs?: number },
): GrowJournalEntry {
  const full: GrowJournalEntry = {
    ...entry,
    id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    spaceId,
    timestampMs: entry.timestampMs ?? Date.now(),
  };
  const existing = loadGrowJournal(spaceId);
  const next = applyJournalRetention([full, ...existing].slice(0, MAX_ENTRIES));
  if (typeof window !== 'undefined') {
    localStorage.setItem(key(spaceId), JSON.stringify(next));
    void import('./ai-cloud.persistence').then((m) => m.cloudSaveGrowJournal(spaceId, next));
  }
  return full;
}

export function getRecentJournalEntries(spaceId: string, limit = 10): GrowJournalEntry[] {
  return loadGrowJournal(spaceId).slice(0, limit);
}

export function mergeGrowJournalFromCloud(spaceId: string, cloudEntries: GrowJournalEntry[]): void {
  if (!spaceId || typeof window === 'undefined' || cloudEntries.length === 0) return;
  const local = loadGrowJournal(spaceId);
  const byId = new Map<string, GrowJournalEntry>();
  for (const entry of [...cloudEntries, ...local]) {
    byId.set(entry.id, entry);
  }
  const merged = applyJournalRetention(
    [...byId.values()].sort((a, b) => b.timestampMs - a.timestampMs).slice(0, MAX_ENTRIES),
  );
  localStorage.setItem(key(spaceId), JSON.stringify(merged));
}

export function addGrowJournalNote(spaceId: string, title: string, body: string): GrowJournalEntry {
  return appendGrowJournalEntry(spaceId, {
    kind: 'user_note',
    title: title.trim() || 'Заметка',
    body: body.trim(),
  });
}

export function journalFromAgentRecommendation(
  spaceId: string,
  title: string,
  body: string,
  phase?: string,
): GrowJournalEntry {
  const recent = loadGrowJournal(spaceId);
  const last = recent[0];
  if (
    last?.kind === 'ai_recommendation' &&
    last.body === body &&
    Date.now() - last.timestampMs < 5 * 60_000
  ) {
    return last;
  }
  return appendGrowJournalEntry(spaceId, {
    kind: 'ai_recommendation',
    title,
    body,
    phase,
  });
}

export function clearGrowJournal(spaceId: string): void {
  if (!spaceId || typeof window === 'undefined') return;
  localStorage.removeItem(key(spaceId));
}

export type { GrowJournalEntryKind };
