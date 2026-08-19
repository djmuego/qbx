import type { AiMemoryEntry, AiMemorySummary, LocalAiMemoryRepository } from '../../domain/ai/ai-memory.types';

const STORAGE_KEY = 'qbx_ai_memory_v1';
const MAX_ENTRIES = 80;

function key(spaceId: string) {
  return `${STORAGE_KEY}_${spaceId}`;
}

function loadRaw(spaceId: string): AiMemoryEntry[] {
  if (!spaceId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key(spaceId));
    return raw ? (JSON.parse(raw) as AiMemoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveRaw(spaceId: string, entries: AiMemoryEntry[]): void {
  if (!spaceId || typeof window === 'undefined') return;
  localStorage.setItem(key(spaceId), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export class LocalAiMemoryStore implements LocalAiMemoryRepository {
  list(spaceId: string): AiMemoryEntry[] {
    return loadRaw(spaceId);
  }

  append(spaceId: string, entry: Omit<AiMemoryEntry, 'id'>): AiMemoryEntry {
    const full: AiMemoryEntry = {
      ...entry,
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    saveRaw(spaceId, [full, ...loadRaw(spaceId)]);
    return full;
  }

  summarize(spaceId: string): AiMemorySummary {
    const entries = loadRaw(spaceId);
    const recentObservations = entries.filter((e) => e.kind === 'observation').slice(0, 5).map((e) => e.summary);
    const recentRecommendations = entries
      .filter((e) => e.kind === 'recommendation')
      .slice(0, 5)
      .map((e) => e.summary);
    const userDecisions = entries.filter((e) => e.kind === 'user_decision').slice(0, 5).map((e) => e.summary);
    return {
      recentObservations,
      recentRecommendations,
      userDecisions,
      lastUpdatedMs: entries[0]?.timestampMs ?? 0,
    };
  }

  clear(spaceId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key(spaceId));
  }
}

export const localAiMemory = new LocalAiMemoryStore();

export function recordObservation(spaceId: string, summary: string): void {
  localAiMemory.append(spaceId, { spaceId, kind: 'observation', summary, timestampMs: Date.now() });
}

export function recordRecommendation(spaceId: string, summary: string): void {
  localAiMemory.append(spaceId, { spaceId, kind: 'recommendation', summary, timestampMs: Date.now() });
}

export function recordUserDecision(spaceId: string, summary: string): void {
  localAiMemory.append(spaceId, { spaceId, kind: 'user_decision', summary, timestampMs: Date.now() });
}
