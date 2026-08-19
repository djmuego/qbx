import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { GrowContext } from '../../domain/ai/grow-context.types';
import { buildGrowContext, type BuildGrowContextInput } from './grow-context.builder';
import { getRecentJournalEntries } from './grow-journal.store';
import { localAiMemory } from './local-ai-memory';
import { analyzeTrends } from './trend-analyzer';
import { computeSpaceHealth } from './space-health.service';

const MISSING_DATA_LABELS: Record<string, string> = {
  temperature: 'Нет датчика температуры',
  humidity: 'Нет датчика влажности',
  soil_moisture: 'Нет датчика влажности субстрата',
  co2: 'Нет EC/CO₂ sensor',
  light: 'Нет PPFD/light sensor',
  ph: 'Нет pH sensor',
  ec: 'Нет EC sensor',
};

export function buildMissingDataList(context: GrowContext): string[] {
  const items = context.dataQuality.missingSensors.map((s) => MISSING_DATA_LABELS[s] ?? `Нет ${s} sensor`);
  if (!context.dataQuality.hasCropProfile) items.push('Культура не указана');
  if (!context.environment.sensors.some((s) => s.type === 'humidity' && s.quality === 'fresh')) {
    items.push('Leaf temperature неизвестна');
  }
  return [...new Set(items)];
}

export interface BuildCultivationContextInput extends BuildGrowContextInput {
  journalLimit?: number;
  includeMemory?: boolean;
}

export function buildCultivationContext(input: BuildCultivationContextInput): CultivationContext {
  const base = buildGrowContext(input);
  const spaceId = base.space?.id ?? '';
  const health = computeSpaceHealth(base);
  const intelligentAlerts = analyzeTrends(base);
  const recentJournal = spaceId ? getRecentJournalEntries(spaceId, input.journalLimit ?? 8) : [];
  const memorySummary = spaceId && input.includeMemory !== false ? localAiMemory.summarize(spaceId) : undefined;
  const missingData = buildMissingDataList(base);

  return {
    ...base,
    health,
    intelligentAlerts,
    recentJournal,
    memorySummary,
    missingData,
  };
}

export { buildGrowContext };
