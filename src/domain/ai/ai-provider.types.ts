export type AiProviderId = 'anthropic' | 'deepseek' | 'openrouter';

export type AiModelTier = 'fast' | 'balanced' | 'smart';

export interface AiModelOption {
  id: string;
  label: string;
  description: string;
  tier: AiModelTier;
  /** Recommended for QBX Agent monitoring + grow help */
  recommended?: boolean;
}

export interface AiProviderInfo {
  id: AiProviderId;
  label: string;
  description: string;
  defaultModel: string;
  modelOptions: AiModelOption[];
  envKey: string;
  docsUrl?: string;
}

export const AI_CUSTOM_MODEL_ID = '__custom__';

export const AI_PROVIDERS: Record<AiProviderId, AiProviderInfo> = {
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'Умные модели V3 и R1 — хороший баланс цены и качества для QBX Agent.',
    defaultModel: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    modelOptions: [
      {
        id: 'deepseek-chat',
        label: 'DeepSeek V3 (Chat)',
        description: 'Рекомендуется для Agent: мониторинг, советы по выращиванию, диалог.',
        tier: 'balanced',
        recommended: true,
      },
      {
        id: 'deepseek-reasoner',
        label: 'DeepSeek R1 (Reasoner)',
        description: 'Глубокий анализ и сложные сценарии. Медленнее, но точнее в рассуждениях.',
        tier: 'smart',
      },
    ],
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    description: 'Claude Sonnet и Haiku через официальный API Anthropic.',
    defaultModel: 'claude-3-5-sonnet-20241022',
    envKey: 'ANTHROPIC_API_KEY',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    modelOptions: [
      {
        id: 'claude-3-5-sonnet-20241022',
        label: 'Claude 3.5 Sonnet',
        description: 'Сильная модель для брифингов и диалога.',
        tier: 'smart',
        recommended: true,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        label: 'Claude 3.5 Haiku',
        description: 'Быстрые ответы, ниже стоимость.',
        tier: 'fast',
      },
    ],
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Единый ключ для сотен моделей — укажите ID модели вручную или выберите из списка.',
    defaultModel: 'deepseek/deepseek-chat',
    envKey: 'OPENROUTER_API_KEY',
    docsUrl: 'https://openrouter.ai/keys',
    modelOptions: [
      {
        id: 'deepseek/deepseek-chat',
        label: 'DeepSeek V3 (via OpenRouter)',
        description: 'DeepSeek Chat через OpenRouter.',
        tier: 'balanced',
        recommended: true,
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        label: 'Claude 3.5 Sonnet',
        description: 'Anthropic через OpenRouter.',
        tier: 'smart',
      },
      {
        id: 'google/gemini-2.0-flash-001',
        label: 'Gemini 2.0 Flash',
        description: 'Быстрая модель Google.',
        tier: 'fast',
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        label: 'Llama 3.3 70B',
        description: 'Open-source instruct-модель.',
        tier: 'balanced',
      },
    ],
  },
};

export interface AiSettings {
  enabled: boolean;
  provider: AiProviderId;
  model: string;
  /** Local expert is primary; gateway only on explicit DeepSeek action */
  localExpertFirst: boolean;
  /** Allow DeepSeek for chat when local patterns miss (still tries local first) */
  useGatewayForChat: boolean;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: true,
  provider: 'deepseek',
  model: AI_PROVIDERS.deepseek.defaultModel,
  localExpertFirst: true,
  useGatewayForChat: false,
};

export function getKnownModelIds(provider: AiProviderId): string[] {
  return AI_PROVIDERS[provider].modelOptions.map((m) => m.id);
}

export function getModelOption(provider: AiProviderId, modelId: string): AiModelOption | undefined {
  return AI_PROVIDERS[provider].modelOptions.find((m) => m.id === modelId);
}

export function isKnownModel(provider: AiProviderId, modelId: string): boolean {
  return getKnownModelIds(provider).includes(modelId);
}

export function getRecommendedModel(provider: AiProviderId): string {
  const recommended = AI_PROVIDERS[provider].modelOptions.find((m) => m.recommended);
  return recommended?.id ?? AI_PROVIDERS[provider].defaultModel;
}

export const AI_PROVIDER_ORDER: AiProviderId[] = ['deepseek', 'anthropic', 'openrouter'];
