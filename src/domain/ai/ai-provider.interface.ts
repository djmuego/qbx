import type { AiChatMessage } from '../../domain/ai/advisor.types';
import type { AiProviderId } from '../../domain/ai/ai-provider.types';

export interface AiRequest {
  provider: AiProviderId;
  model: string;
  messages: AiChatMessage[];
  responseFormat?: 'json' | 'text';
}

export interface AiUsageMetrics {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AiResponse {
  content: string;
  provider: AiProviderId;
  model: string;
  latencyMs: number;
  usage?: AiUsageMetrics;
}

export interface AiProvider {
  readonly id: AiProviderId;
  chat(request: AiRequest): Promise<AiResponse>;
  analyzeSpace?(context: import('./grow-context.types').GrowContext): Promise<AiResponse>;
  generateRecommendations?(context: import('./grow-context.types').GrowContext): Promise<AiResponse>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly provider: AiProviderId,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
