import type { AiProvider } from '../../../domain/ai/ai-provider.interface';
import type { AiProviderId } from '../../../domain/ai/ai-provider.types';
import { MockAiProvider, ProxyAiProvider } from './proxy-ai.provider';

const proxyProviders = new Map<AiProviderId, AiProvider>();

export function getAiProvider(providerId: AiProviderId, options?: { mock?: boolean }): AiProvider {
  if (options?.mock) return new MockAiProvider();

  let provider = proxyProviders.get(providerId);
  if (!provider) {
    provider = new ProxyAiProvider(providerId);
    proxyProviders.set(providerId, provider);
  }
  return provider;
}

export function resetAiProvidersForTests(): void {
  proxyProviders.clear();
}
