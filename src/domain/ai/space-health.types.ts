export type SpaceHealthFactorStatus = 'ok' | 'warning' | 'critical' | 'unknown';

export interface SpaceHealthFactor {
  id: string;
  label: string;
  status: SpaceHealthFactorStatus;
  detail?: string;
}

export type SpaceHealthLabel = 'Отлично' | 'Хорошо' | 'Требует внимания' | 'Критично' | 'Нет данных';

export interface SpaceHealthSummary {
  score: number;
  label: SpaceHealthLabel;
  factors: SpaceHealthFactor[];
  computedAtMs: number;
}
