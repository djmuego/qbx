import type { AiProvider, AiRequest, AiResponse } from '../../../domain/ai/ai-provider.interface';
import type { AiProviderId } from '../../../domain/ai/ai-provider.types';

async function postToProxy(body: Record<string, unknown>): Promise<AiResponse> {
  const started = Date.now();
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    content?: string;
    provider?: string;
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `AI request failed (${response.status})`);
  }

  if (!payload.content) {
    throw new Error('Empty AI response');
  }

  return {
    content: payload.content,
    provider: (payload.provider ?? body.provider) as AiProviderId,
    model: (payload.model ?? body.model) as string,
    latencyMs: Date.now() - started,
    usage: payload.usage
      ? {
          promptTokens: payload.usage.prompt_tokens,
          completionTokens: payload.usage.completion_tokens,
          totalTokens: payload.usage.total_tokens,
        }
      : undefined,
  };
}

/** Server-side proxy transport — keeps API keys out of provider-specific UI code. */
export class ProxyAiProvider implements AiProvider {
  readonly id: AiProviderId;

  constructor(id: AiProviderId) {
    this.id = id;
  }

  async chat(request: AiRequest): Promise<AiResponse> {
    return postToProxy({
      provider: request.provider,
      model: request.model,
      messages: request.messages,
      responseFormat: request.responseFormat ?? 'json',
    });
  }
}

export class MockAiProvider implements AiProvider {
  readonly id: AiProviderId = 'deepseek';

  async chat(request: AiRequest): Promise<AiResponse> {
    const isJson = request.responseFormat === 'json';
    return {
      content: isJson
        ? JSON.stringify({
            status: 'waiting',
            headline: 'Mock Grow Agent',
            summary: 'Mock provider response for tests.',
            confidence: 'low',
            observations: [],
            warnings: [],
            recommendations: [],
            questions: [],
            proposedAutomations: [],
            missingSensors: [],
            evidenceSources: ['mock'],
            watchItems: [],
            nextSteps: [],
          })
        : 'Mock ответ QBX Grow Agent.',
      provider: 'deepseek',
      model: request.model,
      latencyMs: 1,
    };
  }
}
