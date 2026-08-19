import { describe, expect, it } from 'vitest';
import { DEFAULT_AI_SETTINGS } from '../../domain/ai/ai-provider.types';
import {
  buildPromptOverlay,
  mergeWorkspaceAiSettings,
  parsePlatformConsciousness,
  parseWorkspaceAiConfig,
  resolveAgentQuickPrompts,
} from './ai-config.resolver';

describe('ai-config.resolver', () => {
  it('parseWorkspaceAiConfig reads managed flag and prompts', () => {
    const parsed = parseWorkspaceAiConfig({
      managedByPlatform: true,
      personalityPrompt: 'Be calm',
      quickPrompts: ['Hello'],
    });
    expect(parsed?.managedByPlatform).toBe(true);
    expect(parsed?.personalityPrompt).toBe('Be calm');
    expect(parsed?.quickPrompts).toEqual(['Hello']);
  });

  it('mergeWorkspaceAiSettings overrides when managed by platform', () => {
    const merged = mergeWorkspaceAiSettings(DEFAULT_AI_SETTINGS, {
      schemaVersion: 1,
      managedByPlatform: true,
      enabled: false,
      provider: 'anthropic',
      model: 'claude-3-5-haiku-20241022',
    });
    expect(merged.enabled).toBe(false);
    expect(merged.provider).toBe('anthropic');
    expect(merged.model).toBe('claude-3-5-haiku-20241022');
  });

  it('mergeWorkspaceAiSettings keeps local when not managed', () => {
    const merged = mergeWorkspaceAiSettings(DEFAULT_AI_SETTINGS, {
      schemaVersion: 1,
      managedByPlatform: false,
      enabled: false,
    });
    expect(merged.enabled).toBe(DEFAULT_AI_SETTINGS.enabled);
  });

  it('buildPromptOverlay merges platform and workspace layers', () => {
    const overlay = buildPromptOverlay(
      parsePlatformConsciousness({
        safetyPreamble: 'SAFETY',
        globalSystemAppend: 'GLOBAL',
        defaultPersonality: 'DEFAULT',
      }),
      parseWorkspaceAiConfig({
        managedByPlatform: true,
        personalityPrompt: 'FARM',
        systemPromptAppend: 'EXTRA',
      }),
    );
    expect(overlay.safetyPreamble).toBe('SAFETY');
    expect(overlay.platformAppend).toBe('GLOBAL');
    expect(overlay.workspacePersonality).toBe('FARM');
    expect(overlay.workspaceAppend).toBe('EXTRA');
  });

  it('resolveAgentQuickPrompts returns workspace prompts when managed', () => {
    const prompts = resolveAgentQuickPrompts(
      parseWorkspaceAiConfig({
        managedByPlatform: true,
        quickPrompts: ['A', 'B'],
      }),
    );
    expect(prompts).toEqual(['A', 'B']);
  });
});
