import type { AiSettings } from '../../domain/ai/ai-provider.types';
import { DEFAULT_AI_SETTINGS } from '../../domain/ai/ai-provider.types';
import type {
  AgentPromptOverlay,
  PlatformConsciousnessConfig,
  WorkspaceAiAdminConfig,
} from '../../domain/ai/ai-admin-config.types';
import { emptyPromptOverlay } from '../../domain/ai/ai-admin-config.types';
import { GROW_AGENT_ROLE } from './prompts/grow-agent.system';

export function parseWorkspaceAiConfig(raw: unknown): WorkspaceAiAdminConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    schemaVersion: 1,
    managedByPlatform: Boolean(o.managedByPlatform),
    enabled: o.enabled as boolean | undefined,
    provider: o.provider as WorkspaceAiAdminConfig['provider'],
    model: typeof o.model === 'string' ? o.model : undefined,
    localExpertFirst: o.localExpertFirst as boolean | undefined,
    useGatewayForChat: o.useGatewayForChat as boolean | undefined,
    personalityPrompt: typeof o.personalityPrompt === 'string' ? o.personalityPrompt : undefined,
    systemPromptAppend: typeof o.systemPromptAppend === 'string' ? o.systemPromptAppend : undefined,
    quickPrompts: Array.isArray(o.quickPrompts)
      ? o.quickPrompts.filter((p): p is string => typeof p === 'string')
      : undefined,
    adminNotes: typeof o.adminNotes === 'string' ? o.adminNotes : undefined,
  };
}

export function parsePlatformConsciousness(raw: unknown): PlatformConsciousnessConfig {
  if (!raw || typeof raw !== 'object') return { schemaVersion: 1 };
  const o = raw as Record<string, unknown>;
  return {
    schemaVersion: 1,
    globalSystemAppend: typeof o.globalSystemAppend === 'string' ? o.globalSystemAppend : undefined,
    defaultPersonality: typeof o.defaultPersonality === 'string' ? o.defaultPersonality : undefined,
    safetyPreamble: typeof o.safetyPreamble === 'string' ? o.safetyPreamble : undefined,
    operatorNotes: typeof o.operatorNotes === 'string' ? o.operatorNotes : undefined,
  };
}

export function mergeWorkspaceAiSettings(
  base: AiSettings,
  workspaceConfig: WorkspaceAiAdminConfig | null,
): AiSettings {
  if (!workspaceConfig?.managedByPlatform) return base;
  return {
    enabled: workspaceConfig.enabled ?? base.enabled,
    provider: workspaceConfig.provider ?? base.provider,
    model: workspaceConfig.model?.trim() || base.model,
    localExpertFirst: workspaceConfig.localExpertFirst ?? base.localExpertFirst,
    useGatewayForChat: workspaceConfig.useGatewayForChat ?? base.useGatewayForChat,
  };
}

export function buildPromptOverlay(
  platform: PlatformConsciousnessConfig | null,
  workspace: WorkspaceAiAdminConfig | null,
): AgentPromptOverlay {
  const overlay = emptyPromptOverlay();
  if (platform?.safetyPreamble?.trim()) {
    overlay.safetyPreamble = platform.safetyPreamble.trim();
  }
  if (platform?.globalSystemAppend?.trim()) {
    overlay.platformAppend = platform.globalSystemAppend.trim();
  }
  if (workspace?.managedByPlatform) {
    if (workspace.personalityPrompt?.trim()) {
      overlay.workspacePersonality = workspace.personalityPrompt.trim();
    }
    if (workspace.systemPromptAppend?.trim()) {
      overlay.workspaceAppend = workspace.systemPromptAppend.trim();
    }
  }
  if (!overlay.workspacePersonality && platform?.defaultPersonality?.trim()) {
    overlay.workspacePersonality = platform.defaultPersonality.trim();
  }
  return overlay;
}

export function resolveAgentQuickPrompts(workspace: WorkspaceAiAdminConfig | null): string[] {
  if (workspace?.managedByPlatform && workspace.quickPrompts?.length) {
    return workspace.quickPrompts.filter((p) => p.trim().length > 0);
  }
  return [];
}

/** Personality block for system prompt — workspace/platform override or default role. */
export function resolvePersonalityBlock(overlay: AgentPromptOverlay): string {
  if (overlay.workspacePersonality) return overlay.workspacePersonality;
  return GROW_AGENT_ROLE;
}

export function serializeWorkspaceAiConfig(config: WorkspaceAiAdminConfig): Record<string, unknown> {
  return { ...config, schemaVersion: 1 };
}

export function serializePlatformConsciousness(config: PlatformConsciousnessConfig): Record<string, unknown> {
  return { ...config, schemaVersion: 1 };
}

export function defaultManagedWorkspaceAiConfig(partial?: Partial<WorkspaceAiAdminConfig>): WorkspaceAiAdminConfig {
  return {
    schemaVersion: 1,
    managedByPlatform: true,
    enabled: partial?.enabled ?? DEFAULT_AI_SETTINGS.enabled,
    provider: partial?.provider ?? DEFAULT_AI_SETTINGS.provider,
    model: partial?.model ?? DEFAULT_AI_SETTINGS.model,
    localExpertFirst: partial?.localExpertFirst ?? DEFAULT_AI_SETTINGS.localExpertFirst,
    useGatewayForChat: partial?.useGatewayForChat ?? DEFAULT_AI_SETTINGS.useGatewayForChat,
    personalityPrompt: partial?.personalityPrompt ?? '',
    systemPromptAppend: partial?.systemPromptAppend ?? '',
    quickPrompts: partial?.quickPrompts ?? [],
    adminNotes: partial?.adminNotes ?? '',
  };
}
