import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { AiEscalationDecision } from '../../domain/intelligence/ai-escalation.types';

export function evaluateAiEscalation(
  context: CultivationContext,
  options?: { userRequestedLlm?: boolean; knowledgeCoveragePercent?: number },
): AiEscalationDecision {
  const userRequestedLlm = options?.userRequestedLlm ?? false;
  const knowledgeCoverage = options?.knowledgeCoveragePercent ?? 70;
  const completeness = context.dataQuality.hasLiveSensorData ? 0.8 : 0.2;
  const complexity = context.intelligentAlerts.length > 3 ? 0.7 : 0.3;
  const ambiguity = context.intelligentAlerts.some((a) => a.type === 'substrate_dryback_anomaly') ? 0.6 : 0.2;
  const risk = context.alerts.emergencyActive ? 1 : context.health.score < 50 ? 0.7 : 0.2;

  let level: AiEscalationDecision['level'] = 'LOCAL_ONLY';
  const reasons: string[] = [];

  if (userRequestedLlm) {
    level = 'LLM_RECOMMENDED';
    reasons.push('User explicitly requested LLM');
  } else if (ambiguity > 0.5 && complexity > 0.5 && completeness > 0.5) {
    level = 'LLM_OPTIONAL';
    reasons.push('Multi-factor ambiguity with sufficient FACT data');
  } else {
    reasons.push('Handled by deterministic engine + local expert');
  }

  if (knowledgeCoverage < 40) {
    reasons.push('Low knowledge coverage — LLM must not invent norms');
  }

  return {
    level,
    reasons,
    factors: {
      contextCompleteness: completeness,
      complexity,
      ambiguity,
      risk,
      knowledgeCoverage: knowledgeCoverage / 100,
      userRequestedLlm,
    },
  };
}
