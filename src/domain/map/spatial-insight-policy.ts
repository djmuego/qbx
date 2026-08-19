import type { SpatialInsight, SpatialInsightKind } from './spatial-intelligence.types';

export type SpatialInsightSeverity = 'attention' | 'info' | 'recommendation';

const SEVERITY_BY_KIND: Record<SpatialInsightKind, SpatialInsightSeverity> = {
  zone_without_sensor: 'attention',
  device_offline: 'attention',
  data_gap: 'attention',
  zone_temperature_difference: 'attention',
  equipment_no_effect: 'attention',
  layout_issue: 'attention',
  plant_without_nearby_sensor: 'info',
  sensor_coverage: 'info',
  sensor_distribution: 'info',
  placement_recommendation: 'recommendation',
};

export function insightSeverity(kind: SpatialInsightKind): SpatialInsightSeverity {
  return SEVERITY_BY_KIND[kind] ?? 'info';
}

export function sortSpatialInsights(insights: SpatialInsight[]): SpatialInsight[] {
  const rank: Record<SpatialInsightSeverity, number> = {
    attention: 0,
    info: 1,
    recommendation: 2,
  };
  return [...insights].sort((a, b) => {
    const sa = rank[insightSeverity(a.kind)];
    const sb = rank[insightSeverity(b.kind)];
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title, 'ru');
  });
}
