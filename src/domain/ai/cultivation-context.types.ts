import type { GrowContext } from './grow-context.types';
import type { AiMemorySummary } from './ai-memory.types';
import type { IntelligentAlert } from './intelligent-alert.types';
import type { SpaceHealthSummary } from './space-health.types';
import type { GrowJournalEntry } from '../grow/grow-journal.types';

/** Enriched context for AI Intelligence Layer (Sense → Analyze → Recommend) */
export interface CultivationContext extends GrowContext {
  health: SpaceHealthSummary;
  intelligentAlerts: IntelligentAlert[];
  recentJournal: GrowJournalEntry[];
  memorySummary?: AiMemorySummary;
  missingData: string[];
}

export function isCultivationContext(context: GrowContext): context is CultivationContext {
  return 'health' in context && 'intelligentAlerts' in context;
}
