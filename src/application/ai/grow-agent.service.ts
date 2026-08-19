import type { AiSettings } from '../../domain/ai/ai-provider.types';
import type { AiChatMessage } from '../../domain/ai/advisor.types';
import type { GrowContext } from '../../domain/ai/grow-context.types';
import type { GrowAgentAnalysis } from '../../domain/ai/grow-agent-response.types';
import type { AgentBriefing, AgentMessage } from '../../domain/ai/agent.types';
import type { AgentPromptOverlay } from '../../domain/ai/ai-admin-config.types';
import type { CropProfile } from '../../domain/grow/crop-profile.types';
import { createExpertAnalysis, tryAnswerLocalQuestion } from './local-grow-expert';
import { resolveCrop } from './knowledge/crop-resolver';
import { inferTopicsFromQuestion, retrieveHybridKnowledgeContext } from './knowledge/hybrid-knowledge-retrieval';
import {
  attachAnalysisMetadata,
  buildGrowAnalysisPrompt,
  buildGrowChatPrompt,
} from './grow-agent-prompt';
import { buildGrowAgentSystemPrompt } from './prompts/grow-agent.system';
import { growAgentResponseSchema } from './grow-agent-response.schema';
import { buildGrowContext } from './grow-context.builder';
import { getAiProvider } from './providers/provider-factory';

export { createLocalAnalysis } from './local-analysis.core';
export { createExpertAnalysis, tryAnswerLocalQuestion } from './local-grow-expert';

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response does not contain JSON');
  return match[0];
}

function mapSeverity(severity: string): 'info' | 'warning' | 'critical' {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning' || severity === 'attention') return 'warning';
  return 'info';
}

export function analysisToBriefing(analysis: GrowAgentAnalysis): AgentBriefing {
  return {
    status: analysis.status,
    headline: analysis.headline,
    summary: analysis.summary,
    insights: analysis.warnings.map((w) => ({
      severity: mapSeverity(w.severity),
      title: w.title,
      detail: w.detail,
    })),
    watchItems: analysis.watchItems,
    nextSteps: analysis.nextSteps,
    generatedAtMs: analysis.generatedAtMs,
  };
}

export async function analyzeGrowContext(
  context: GrowContext,
  settings: AiSettings,
  options?: {
    mock?: boolean;
    cropProfile?: CropProfile | null;
    forceGateway?: boolean;
    promptOverlay?: AgentPromptOverlay;
  },
): Promise<GrowAgentAnalysis> {
  if (!options?.forceGateway) {
    return createExpertAnalysis(context, options?.cropProfile);
  }

  if (!settings.enabled) {
    return createExpertAnalysis(context, options?.cropProfile);
  }

  const resolved = resolveCrop(context, options?.cropProfile);
  const knowledge = await retrieveHybridKnowledgeContext({
    cropSlug: resolved?.slug,
    growContext: context,
    maxCharacters: 10000,
  });
  const provider = getAiProvider(settings.provider, options);

  const result = await provider.chat({
    provider: settings.provider,
    model: settings.model,
    responseFormat: 'json',
    messages: [
      { role: 'system', content: buildGrowAgentSystemPrompt(knowledge, options?.promptOverlay) },
      { role: 'user', content: buildGrowAnalysisPrompt(context) },
    ],
  });

  const parsed = growAgentResponseSchema.parse(JSON.parse(extractJson(result.content)));
  const analysis = attachAnalysisMetadata(parsed, context);
  return { ...analysis, evidenceSources: ['SOURCE: DEEPSEEK', ...analysis.evidenceSources] };
}

export async function askGrowAgent(
  context: GrowContext,
  question: string,
  history: AgentMessage[],
  settings: AiSettings,
  options?: {
    mock?: boolean;
    cropProfile?: CropProfile | null;
    forceGateway?: boolean;
    promptOverlay?: AgentPromptOverlay;
  },
): Promise<string> {
  if (!options?.forceGateway) {
    const local = tryAnswerLocalQuestion(context, question, options?.cropProfile);
    if (local) return local;
  }

  if (!settings.enabled) {
    return 'AI-помощник отключён. Локальный эксперт не нашёл шаблон для этого вопроса — включите DeepSeek в Настройках или уточните вопрос.';
  }

  if (settings.localExpertFirst && !settings.useGatewayForChat && !options?.forceGateway) {
    return 'Локальный эксперт не покрыл этот вопрос. Нажмите «DeepSeek» в чате или включите «Gateway для чата» в настройках AI.';
  }

  const resolved = resolveCrop(context, options?.cropProfile);
  const knowledge = await retrieveHybridKnowledgeContext({
    question,
    topics: inferTopicsFromQuestion(question),
    cropSlug: resolved?.slug,
    growContext: context,
    maxCharacters: 8000,
  });

  const messages: AiChatMessage[] = [
    { role: 'system', content: buildGrowAgentSystemPrompt(knowledge, options?.promptOverlay) },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: buildGrowChatPrompt(context, question) },
  ];

  const provider = getAiProvider(settings.provider, options);
  const result = await provider.chat({
    provider: settings.provider,
    model: settings.model,
    responseFormat: 'text',
    messages,
  });

  return result.content.trim();
}

export { buildCultivationContext, buildGrowContext } from './cultivation-context.builder';
