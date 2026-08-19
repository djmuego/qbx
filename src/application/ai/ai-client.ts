import type { AiSettings } from '../../domain/ai/ai-provider.types';
import type { AiChatMessage } from '../../domain/ai/advisor.types';
import type { AiCompletionRequest, AiCompletionResult } from './ai-client.types';
import { getAiProvider } from './providers/provider-factory';

export class AiClientError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiClientError';
  }
}

export type { AiCompletionRequest, AiCompletionResult };

export async function completeChat(request: AiCompletionRequest): Promise<AiCompletionResult> {
  try {
    const provider = getAiProvider(request.settings.provider);
    const result = await provider.chat({
      provider: request.settings.provider,
      model: request.settings.model,
      messages: request.messages,
      responseFormat: request.responseFormat ?? 'json',
    });

    return {
      content: result.content,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      usage: result.usage,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    throw new AiClientError(message);
  }
}

export async function testAiConnection(settings: AiSettings): Promise<AiCompletionResult> {
  return completeChat({
    settings,
    responseFormat: 'text',
    messages: [{ role: 'user', content: 'Ответь одним словом: OK' }],
  });
}
