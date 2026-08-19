import type { AiProviderId } from './ai-provider.types';

export const DEFAULT_AGENT_QUICK_PROMPTS = [
  'Что проверить сейчас?',
  'Как настроить полив?',
  'Нужна ли автоматизация вентиляции?',
  'Что делать дальше?',
];

export interface WorkspaceAiAdminConfig {
  schemaVersion: 1;
  /** When true, workspace uses admin-managed AI settings (overrides user localStorage). */
  managedByPlatform: boolean;
  enabled?: boolean;
  provider?: AiProviderId;
  model?: string;
  localExpertFirst?: boolean;
  useGatewayForChat?: boolean;
  /** Replaces default personality block when non-empty. */
  personalityPrompt?: string;
  /** Appended to system prompt for this farm. */
  systemPromptAppend?: string;
  quickPrompts?: string[];
  /** Internal support notes (admin only). */
  adminNotes?: string;
}

export interface PlatformConsciousnessConfig {
  schemaVersion: 1;
  /** Appended to every Grow Agent system prompt globally. */
  globalSystemAppend?: string;
  /** Default personality when workspace has no override. */
  defaultPersonality?: string;
  /** Extra safety / policy block prepended before reasoning rules. */
  safetyPreamble?: string;
  /** Notes for operators — shown in admin only. */
  operatorNotes?: string;
}

export interface AgentPromptOverlay {
  platformAppend: string;
  workspacePersonality: string;
  workspaceAppend: string;
  safetyPreamble: string;
}

export const DEFAULT_WORKSPACE_AI_ADMIN_CONFIG: WorkspaceAiAdminConfig = {
  schemaVersion: 1,
  managedByPlatform: false,
};

export const DEFAULT_PLATFORM_CONSCIOUSNESS: PlatformConsciousnessConfig = {
  schemaVersion: 1,
};

export function emptyPromptOverlay(): AgentPromptOverlay {
  return {
    platformAppend: '',
    workspacePersonality: '',
    workspaceAppend: '',
    safetyPreamble: '',
  };
}
