export type GrowAgentConfidence = 'high' | 'medium' | 'low';

export type GrowAgentSeverity = 'info' | 'attention' | 'warning' | 'critical';

export type GrowAgentStatus = 'ok' | 'attention' | 'critical' | 'waiting';

export interface GrowAgentEvidence {
  label: string;
  kind: 'FACT' | 'DERIVED' | 'INFERENCE' | 'UNKNOWN';
  detail: string;
}

export interface GrowAgentObservation {
  title: string;
  detail: string;
  evidence: GrowAgentEvidence[];
}

export interface GrowAgentWarning {
  severity: GrowAgentSeverity;
  title: string;
  detail: string;
  evidence: GrowAgentEvidence[];
}

export interface GrowAgentRecommendation {
  title: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  evidence: GrowAgentEvidence[];
  suggestedAction: string;
  confidence: GrowAgentConfidence;
  expectedEffect?: string;
  risk?: string;
  requiresUserAction?: boolean;
}

export interface ProposedAutomation {
  title: string;
  description: string;
  triggerSummary: string;
  actionSummary: string;
  reason: string;
  confidence: GrowAgentConfidence;
}

export interface GrowAgentResponse {
  status: GrowAgentStatus;
  summary: string;
  headline: string;
  confidence: GrowAgentConfidence;
  /** Deterministic health score from SpaceHealthService — not LLM-computed */
  healthScore?: number;
  healthLabel?: string;
  possibleCauses?: string[];
  observations: GrowAgentObservation[];
  warnings: GrowAgentWarning[];
  recommendations: GrowAgentRecommendation[];
  questions: string[];
  proposedAutomations: ProposedAutomation[];
  missingSensors: string[];
  missingData?: string[];
  evidenceSources: string[];
  watchItems: string[];
  nextSteps: string[];
}

/** Backward-compatible briefing shape for home tile + legacy store */
export interface GrowAgentAnalysis extends GrowAgentResponse {
  generatedAtMs: number;
  contextCapturedAtMs: number;
  promptVersion: string;
}
