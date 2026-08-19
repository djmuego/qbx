export type AiEscalationLevel = 'LOCAL_ONLY' | 'LLM_OPTIONAL' | 'LLM_RECOMMENDED';

export interface AiEscalationDecision {
  level: AiEscalationLevel;
  reasons: string[];
  factors: {
    contextCompleteness: number;
    complexity: number;
    ambiguity: number;
    risk: number;
    knowledgeCoverage: number;
    userRequestedLlm: boolean;
  };
}
