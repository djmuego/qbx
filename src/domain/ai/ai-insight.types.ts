import type { GrowAgentConfidence } from './grow-agent-response.types';

export type AiInsightStatus = 'new' | 'seen' | 'acknowledged' | 'resolved' | 'dismissed';

export type AiInsightType = 'observation' | 'warning' | 'recommendation' | 'question' | 'proposed_automation';

export interface AiInsight {
  id: string;
  spaceId: string;
  growRunId?: string;
  createdAtMs: number;
  type: AiInsightType;
  severity: 'info' | 'attention' | 'warning' | 'critical';
  title: string;
  summary: string;
  evidence: string[];
  recommendations: string[];
  confidence: GrowAgentConfidence;
  status: AiInsightStatus;
  dedupeKey?: string;
}
