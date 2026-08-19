import type { GrowContext } from '../../domain/ai/grow-context.types';
import type { GrowAgentAnalysis } from '../../domain/ai/grow-agent-response.types';
import { QBX_GROW_AGENT_PROMPT_VERSION } from './prompts/grow-agent.system';
import { formatGrowContextForPrompt } from './telemetry-summary';

export function buildGrowAnalysisPrompt(context: GrowContext): string {
  return `Analyze the QBX GrowContext and return ONLY valid JSON matching GrowAgentResponse schema.

DATA SOURCE: ${context.meta.dataSource.toUpperCase()}
AGENT MODE: ${context.meta.agentMode.toUpperCase()}

Rules:
- Classify each statement: FACT (from context), DERIVED (telemetry/VPD), INFERENCE, RECOMMENDATION.
- Include evidence[] with kind labels on observations, warnings, recommendations.
- If fan/ventilation already ON — do NOT recommend turning it on without checking duration/trend.
- If sensor quality is stale — say data is stale, do not agronomic conclusions from old values.
- confidence=low when dataQuality.confidenceHint is low.
- List missingSensors from dataQuality.missingSensors when relevant.
- proposedAutomations are proposals only — user must approve.

GrowContext:
${formatGrowContextForPrompt(context)}`;
}

export function buildGrowChatPrompt(context: GrowContext, question: string): string {
  return `GrowContext (JSON):
${formatGrowContextForPrompt(context)}

User question: ${question}

Answer in Russian. Use FACT/DERIVED/INFERENCE/RECOMMENDATION/UNKNOWN discipline. Cite evidence sources when relevant.`;
}

export function buildGrowAnalysisEvidenceSources(context: GrowContext): string[] {
  const sources: string[] = [];
  if (context.meta.dataSource === 'simulator') sources.push('DATA SOURCE: SIMULATOR');
  if (context.space) sources.push(`Space: ${context.space.name}`);
  sources.push(`Stage: ${context.growStage.stageName}`);
  for (const s of context.environment.sensors.filter((x) => x.quality === 'fresh')) {
    sources.push(`${s.name} (${s.type})`);
  }
  for (const e of context.equipment) {
    sources.push(`${e.name}: ${e.reportedState ? 'ON' : 'OFF'} (${e.controlMode})`);
  }
  if (context.automations.length) sources.push(`${context.automations.length} automation(s)`);
  return sources;
}

export function attachAnalysisMetadata(
  response: Omit<GrowAgentAnalysis, 'generatedAtMs' | 'contextCapturedAtMs' | 'promptVersion'>,
  context: GrowContext,
): GrowAgentAnalysis {
  return {
    ...response,
    evidenceSources: response.evidenceSources.length
      ? response.evidenceSources
      : buildGrowAnalysisEvidenceSources(context),
    generatedAtMs: Date.now(),
    contextCapturedAtMs: context.meta.capturedAtMs,
    promptVersion: QBX_GROW_AGENT_PROMPT_VERSION,
  };
}
