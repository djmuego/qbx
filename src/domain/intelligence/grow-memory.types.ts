/** Three memory layers for intelligence */
export interface KnowledgeMemorySummary {
  topicsAvailable: string[];
  trustCounts: Record<string, number>;
}

export interface GrowRunMemorySummary {
  growRunId?: string;
  dayCount?: number;
  notableEvents: string[];
}

export interface FacilityMemorySummary {
  spaceId: string;
  equipmentObservations: string[];
  lastEffectVerifications: string[];
}

export interface GrowMemorySummary {
  knowledge: KnowledgeMemorySummary;
  growRun: GrowRunMemorySummary;
  facility: FacilityMemorySummary;
}
