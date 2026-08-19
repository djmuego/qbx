export interface DailyBriefing {
  headline: string;
  healthScore: number;
  healthLabel: string;
  overnightSummary: string;
  highlights: string[];
  todayActions: string[];
  generatedAtMs: number;
  source: 'local';
}
