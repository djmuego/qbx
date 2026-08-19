import {
  AI_PROVIDERS,
  DEFAULT_AI_SETTINGS,
  getKnownModelIds,
  getModelOption,
  getRecommendedModel,
  isKnownModel as isKnownModelId,
  type AiModelOption,
  type AiProviderId,
  type AiSettings,
} from '../../domain/ai/ai-provider.types';

const STORAGE_KEY = 'qbx_ai_settings_v1';

export function loadAiSettings(): AiSettings {
  if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    const provider = (parsed.provider ?? DEFAULT_AI_SETTINGS.provider) as AiProviderId;
    const providerInfo = AI_PROVIDERS[provider] ?? AI_PROVIDERS.deepseek;
    const model = parsed.model?.trim() || providerInfo.defaultModel;

    return {
      enabled: parsed.enabled ?? DEFAULT_AI_SETTINGS.enabled,
      provider,
      model,
      localExpertFirst: parsed.localExpertFirst ?? DEFAULT_AI_SETTINGS.localExpertFirst,
      useGatewayForChat: parsed.useGatewayForChat ?? DEFAULT_AI_SETTINGS.useGatewayForChat,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getModelOptionsForProvider(provider: AiProviderId): AiModelOption[] {
  return AI_PROVIDERS[provider].modelOptions;
}

/** @deprecated use getModelOptionsForProvider */
export function getModelsForProvider(provider: AiProviderId): string[] {
  return getKnownModelIds(provider);
}

export function getModelDisplayLabel(provider: AiProviderId, modelId: string): string {
  const known = getModelOption(provider, modelId);
  if (known) return known.label;
  return modelId;
}

export function resolveModelSelectValue(provider: AiProviderId, modelId: string): string {
  return isKnownModel(provider, modelId) ? modelId : modelId;
}

export function isKnownModel(provider: AiProviderId, modelId: string): boolean {
  return isKnownModelId(provider, modelId);
}

export function settingsUseCustomModel(settings: AiSettings): boolean {
  return !isKnownModel(settings.provider, settings.model);
}

export function applyProviderChange(provider: AiProviderId): Partial<AiSettings> {
  return {
    provider,
    model: getRecommendedModel(provider),
  };
}
