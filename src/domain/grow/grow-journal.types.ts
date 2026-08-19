export type GrowJournalEntryKind =
  | 'userAction'
  | 'automationAction'
  | 'aiRecommendation'
  | 'environmentIncident'
  | 'irrigation'
  | 'stageChange'
  | 'plantObservation'
  | 'equipmentIssue'
  | 'treatment'
  | 'harvest'
  | 'note'
  | 'observation'
  | 'action'
  | 'event'
  | 'ai_recommendation'
  | 'user_note'
  | 'manual'
  | 'system'
  | 'ai'
  | 'automation';

export interface GrowJournalEntry {
  id: string;
  spaceId: string;
  growRunId?: string;
  kind: GrowJournalEntryKind;
  title: string;
  body: string;
  timestampMs: number;
  phase?: string;
  metadata?: Record<string, string>;
}
