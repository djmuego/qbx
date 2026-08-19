export interface KnowledgeCoverageDimension {
  topic: string;
  coveragePercent: number;
  trustLevel: string;
  gaps: string[];
}

export interface KnowledgeCoverageReport {
  cropId?: string;
  stageId?: string;
  overallPercent: number;
  dimensions: KnowledgeCoverageDimension[];
  honestLimitations: string[];
}
