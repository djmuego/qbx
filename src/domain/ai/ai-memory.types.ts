export type AiMemoryEntryKind = 'conversation' | 'observation' | 'recommendation' | 'user_decision';

export interface AiMemoryEntry {
  id: string;
  spaceId: string;
  kind: AiMemoryEntryKind;
  summary: string;
  timestampMs: number;
  metadata?: Record<string, string>;
}

export interface AiMemorySummary {
  recentObservations: string[];
  recentRecommendations: string[];
  userDecisions: string[];
  lastUpdatedMs: number;
}

export interface LocalAiMemoryRepository {
  list(spaceId: string): AiMemoryEntry[];
  append(spaceId: string, entry: Omit<AiMemoryEntry, 'id'>): AiMemoryEntry;
  summarize(spaceId: string): AiMemorySummary;
  clear(spaceId: string): void;
}
