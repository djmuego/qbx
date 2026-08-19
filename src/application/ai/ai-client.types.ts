import type { AiSettings } from '../../domain/ai/ai-provider.types';
import type { AiChatMessage } from '../../domain/ai/advisor.types';

export interface AiCompletionRequest {
  messages: AiChatMessage[];
  settings: AiSettings;
  responseFormat?: 'json' | 'text';
}

export interface AiCompletionResult {
  content: string;
  provider: string;
  model: string;
  latencyMs?: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}
