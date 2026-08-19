import type { SupabaseClient } from '@supabase/supabase-js';
import type { GrowAgentAnalysis } from '../../domain/ai/grow-agent-response.types';
import type { AgentMessage } from '../../domain/ai/agent.types';
import type { CropProfile } from '../../domain/grow/crop-profile.types';
import { applyJournalRetention } from '../commercial/journal-retention';
import type { GrowJournalEntry } from '../../domain/grow/grow-journal.types';

export interface AiCloudContext {
  client: SupabaseClient;
  workspaceId: string;
}

let cloudCtx: AiCloudContext | null = null;

export function setAiCloudContext(ctx: AiCloudContext | null) {
  cloudCtx = ctx;
}

export function getAiCloudContext(): AiCloudContext | null {
  return cloudCtx;
}

export async function cloudLoadAgentAnalysis(spaceId: string): Promise<GrowAgentAnalysis | null> {
  if (!cloudCtx) return null;
  const { data } = await cloudCtx.client
    .from('agent_analyses')
    .select('payload')
    .eq('workspace_id', cloudCtx.workspaceId)
    .eq('space_id', spaceId)
    .maybeSingle();
  return data?.payload ? (data.payload as GrowAgentAnalysis) : null;
}

export async function cloudSaveAgentAnalysis(spaceId: string, analysis: GrowAgentAnalysis): Promise<void> {
  if (!cloudCtx) return;
  await cloudCtx.client.from('agent_analyses').upsert({
    workspace_id: cloudCtx.workspaceId,
    space_id: spaceId,
    payload: analysis,
    updated_at: new Date().toISOString(),
  });
}

export async function cloudLoadAgentChat(spaceId: string): Promise<AgentMessage[]> {
  if (!cloudCtx) return [];
  const { data } = await cloudCtx.client
    .from('agent_chats')
    .select('messages')
    .eq('workspace_id', cloudCtx.workspaceId)
    .eq('space_id', spaceId)
    .maybeSingle();
  return data?.messages ? (data.messages as AgentMessage[]) : [];
}

export async function cloudSaveAgentChat(spaceId: string, messages: AgentMessage[]): Promise<void> {
  if (!cloudCtx) return;
  await cloudCtx.client.from('agent_chats').upsert({
    workspace_id: cloudCtx.workspaceId,
    space_id: spaceId,
    messages: messages.slice(-50),
    updated_at: new Date().toISOString(),
  });
}

export async function cloudClearAgentChat(spaceId: string): Promise<void> {
  if (!cloudCtx) return;
  await cloudCtx.client.from('agent_chats').delete().eq('workspace_id', cloudCtx.workspaceId).eq('space_id', spaceId);
}

export async function cloudLoadCropProfile(spaceId: string): Promise<CropProfile | null> {
  if (!cloudCtx) return null;
  const { data } = await cloudCtx.client
    .from('crop_profiles')
    .select('payload')
    .eq('workspace_id', cloudCtx.workspaceId)
    .eq('space_id', spaceId)
    .maybeSingle();
  return data?.payload ? (data.payload as CropProfile) : null;
}

export async function cloudSaveCropProfile(spaceId: string, profile: CropProfile): Promise<void> {
  if (!cloudCtx) return;
  await cloudCtx.client.from('crop_profiles').upsert({
    workspace_id: cloudCtx.workspaceId,
    space_id: spaceId,
    payload: profile,
    updated_at: new Date().toISOString(),
  });
}

export async function cloudClearCropProfile(spaceId: string): Promise<void> {
  if (!cloudCtx) return;
  await cloudCtx.client.from('crop_profiles').delete().eq('workspace_id', cloudCtx.workspaceId).eq('space_id', spaceId);
}

export async function cloudLoadGrowJournal(spaceId: string): Promise<GrowJournalEntry[]> {
  if (!cloudCtx) return [];
  const { data } = await cloudCtx.client
    .from('grow_journals')
    .select('entries')
    .eq('workspace_id', cloudCtx.workspaceId)
    .eq('space_id', spaceId)
    .maybeSingle();
  const entries = data?.entries ? (data.entries as GrowJournalEntry[]) : [];
  return applyJournalRetention(entries);
}

export async function cloudSaveGrowJournal(spaceId: string, entries: GrowJournalEntry[]): Promise<void> {
  if (!cloudCtx) return;
  const retained = applyJournalRetention(entries.slice(0, 100));
  await cloudCtx.client.from('grow_journals').upsert({
    workspace_id: cloudCtx.workspaceId,
    space_id: spaceId,
    entries: retained,
    updated_at: new Date().toISOString(),
  });
}
