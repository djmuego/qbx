import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlatformConsciousnessConfig, WorkspaceAiAdminConfig } from '../../domain/ai/ai-admin-config.types';
import { parsePlatformConsciousness, parseWorkspaceAiConfig } from '../ai/ai-config.resolver';

const LOCAL_WS_KEY = 'qbx_local_workspace_ai_config_v1';
const LOCAL_PLATFORM_KEY = 'qbx_local_platform_consciousness_v1';

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function fetchPlatformConsciousnessCloud(
  client: SupabaseClient,
): Promise<PlatformConsciousnessConfig> {
  const { data, error } = await client.rpc('get_platform_consciousness');
  if (error) throw new Error(error.message);
  return parsePlatformConsciousness(data);
}

export async function fetchWorkspaceAiConfigCloud(
  client: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceAiAdminConfig | null> {
  const { data, error } = await client.rpc('get_workspace_ai_config', { ws_id: workspaceId });
  if (error) throw new Error(error.message);
  return parseWorkspaceAiConfig(data);
}

export function getLocalWorkspaceAiConfig(workspaceId: string): WorkspaceAiAdminConfig | null {
  const map = readJson<Record<string, WorkspaceAiAdminConfig>>(LOCAL_WS_KEY, {});
  return map[workspaceId] ?? null;
}

export function setLocalWorkspaceAiConfig(workspaceId: string, config: WorkspaceAiAdminConfig): void {
  const map = readJson<Record<string, WorkspaceAiAdminConfig>>(LOCAL_WS_KEY, {});
  map[workspaceId] = config;
  writeJson(LOCAL_WS_KEY, map);
}

export function getLocalPlatformConsciousness(): PlatformConsciousnessConfig {
  return readJson<PlatformConsciousnessConfig>(LOCAL_PLATFORM_KEY, { schemaVersion: 1 });
}

export function setLocalPlatformConsciousness(config: PlatformConsciousnessConfig): void {
  writeJson(LOCAL_PLATFORM_KEY, config);
}
