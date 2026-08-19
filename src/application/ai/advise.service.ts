import type { GrowContext } from '../../domain/ai/grow-context.types';
import type { GrowTelemetryContext } from '../../domain/ai/knowledge-base.types';
import type { AiSettings } from '../../domain/ai/ai-provider.types';
import type { CropProfile } from '../../domain/grow/crop-profile.types';
import type { AgentPromptOverlay } from '../../domain/ai/ai-admin-config.types';
import { AIAssistantService, buildGrowTelemetryContext } from './ai-assistant.service';
import { resolveCrop } from './knowledge/crop-resolver';
import { inferTopicsFromQuestion, retrieveHybridKnowledgeContext } from './knowledge/hybrid-knowledge-retrieval';
import { tryAnswerLocalQuestion } from './local-grow-expert';
import { buildGrowAgentSystemPrompt } from './prompts/grow-agent.system';
import { buildGrowChatPrompt } from './grow-agent-prompt';
import { getAiProvider } from './providers/provider-factory';

export interface AdviseRequest {
  question: string;
  growContext: GrowContext;
  cropProfile?: CropProfile | null;
  settings?: AiSettings;
  promptOverlay?: AgentPromptOverlay;
  forceGateway?: boolean;
}

export interface AdviseResponse {
  answer: string;
  source: 'local' | 'gateway';
  telemetry: GrowTelemetryContext;
  knowledgeChunkCount: number;
}

/**
 * RAG-backed agronomist advise — used by /api/ai/advise and can be called from Grow Agent.
 * Isolated from AutomationEngine (advisory only).
 */
export async function adviseGrower(request: AdviseRequest): Promise<AdviseResponse> {
  const question = request.question.trim();
  if (!question) {
    throw new Error('Question is required');
  }

  const telemetry = buildGrowTelemetryContext(request.growContext);

  if (!request.forceGateway) {
    const local = tryAnswerLocalQuestion(request.growContext, question, request.cropProfile);
    if (local) {
      return { answer: local, source: 'local', telemetry, knowledgeChunkCount: 0 };
    }
  }

  const resolved = resolveCrop(request.growContext, request.cropProfile);
  const ragChunks = await AIAssistantService.retrieveRelevantContext(question, { matchCount: 6 });
  const hybridKnowledge = await retrieveHybridKnowledgeContext({
    question,
    topics: inferTopicsFromQuestion(question),
    cropSlug: resolved?.slug,
    growContext: request.growContext,
    maxCharacters: 10000,
  });

  const settings = request.settings;
  if (!settings?.enabled || (!request.forceGateway && settings.localExpertFirst && !settings.useGatewayForChat)) {
    return {
      answer:
        'Локальный эксперт не покрыл вопрос. Включите DeepSeek в настройках AI или нажмите «DeepSeek» в чате агента.',
      source: 'local',
      telemetry,
      knowledgeChunkCount: ragChunks.length,
    };
  }

  const provider = getAiProvider(settings.provider);
  const result = await provider.chat({
    provider: settings.provider,
    model: settings.model,
    responseFormat: 'text',
    messages: [
      { role: 'system', content: buildGrowAgentSystemPrompt(hybridKnowledge, request.promptOverlay) },
      { role: 'user', content: buildGrowChatPrompt(request.growContext, question) },
    ],
  });

  return {
    answer: result.content.trim(),
    source: 'gateway',
    telemetry,
    knowledgeChunkCount: ragChunks.length,
  };
}
