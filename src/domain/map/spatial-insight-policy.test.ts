import { describe, expect, it } from 'vitest';
import { insightSeverity, sortSpatialInsights } from './spatial-insight-policy';
import type { SpatialInsight } from './spatial-intelligence.types';

function insight(kind: SpatialInsight['kind'], title: string): SpatialInsight {
  return {
    kind,
    title,
    detail: '',
    dataKind: 'FACT',
    confidence: 'high',
    evidence: [],
  };
}

describe('spatial-insight-policy', () => {
  it('ranks attention insights before recommendations', () => {
    const sorted = sortSpatialInsights([
      insight('placement_recommendation', 'B'),
      insight('zone_without_sensor', 'A'),
    ]);
    expect(sorted[0]?.kind).toBe('zone_without_sensor');
  });

  it('classifies placement recommendation as recommendation severity', () => {
    expect(insightSeverity('placement_recommendation')).toBe('recommendation');
  });
});
