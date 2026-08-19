import type { WorkspaceIntegrationsConfig } from '../../domain/integrations/hub-integration.types';
import { defaultIntegrationsConfig } from '../../domain/integrations/hub-integration.types';
import { getAiCloudContext } from '../ai/ai-cloud.persistence';

export async function cloudLoadIntegrationsConfig(): Promise<WorkspaceIntegrationsConfig | null> {
  const ctx = getAiCloudContext();
  if (!ctx) return null;
  const { data, error } = await ctx.client
    .from('workspace_integrations')
    .select('payload')
    .eq('workspace_id', ctx.workspaceId)
    .maybeSingle();
  if (error || !data?.payload) return null;
  return { ...defaultIntegrationsConfig(), ...(data.payload as WorkspaceIntegrationsConfig) };
}

export async function cloudSaveIntegrationsConfig(config: WorkspaceIntegrationsConfig): Promise<void> {
  const ctx = getAiCloudContext();
  if (!ctx) return;
  await ctx.client.from('workspace_integrations').upsert({
    workspace_id: ctx.workspaceId,
    payload: config,
    updated_at: new Date().toISOString(),
  });
}
