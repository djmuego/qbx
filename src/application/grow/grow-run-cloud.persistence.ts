import type { GrowRun } from '../../domain/grow/grow-run.types';
import type { GrowRunTelemetrySample } from '../../domain/grow/grow-run-telemetry.types';
import { getAiCloudContext } from '../ai/ai-cloud.persistence';

export async function cloudLoadGrowRuns(spaceId: string): Promise<GrowRun[]> {
  const ctx = getAiCloudContext();
  if (!ctx || !spaceId) return [];
  const { data, error } = await ctx.client
    .from('grow_runs')
    .select('runs')
    .eq('workspace_id', ctx.workspaceId)
    .eq('space_id', spaceId)
    .maybeSingle();
  if (error || !data?.runs) return [];
  return Array.isArray(data.runs) ? (data.runs as GrowRun[]) : [];
}

export async function cloudSaveGrowRuns(spaceId: string, runs: GrowRun[]): Promise<void> {
  const ctx = getAiCloudContext();
  if (!ctx || !spaceId) return;
  await ctx.client.from('grow_runs').upsert({
    workspace_id: ctx.workspaceId,
    space_id: spaceId,
    runs,
    updated_at: new Date().toISOString(),
  });
}

export async function cloudLoadGrowRunTelemetry(
  spaceId: string,
  growRunId: string,
): Promise<GrowRunTelemetrySample[]> {
  const ctx = getAiCloudContext();
  if (!ctx || !spaceId || !growRunId) return [];
  const { data, error } = await ctx.client
    .from('grow_run_telemetry')
    .select('samples')
    .eq('workspace_id', ctx.workspaceId)
    .eq('space_id', spaceId)
    .eq('grow_run_id', growRunId)
    .maybeSingle();
  if (error || !data?.samples) return [];
  return Array.isArray(data.samples) ? (data.samples as GrowRunTelemetrySample[]) : [];
}

export async function cloudSaveGrowRunTelemetry(
  spaceId: string,
  growRunId: string,
  samples: GrowRunTelemetrySample[],
): Promise<void> {
  const ctx = getAiCloudContext();
  if (!ctx || !spaceId || !growRunId) return;
  await ctx.client.from('grow_run_telemetry').upsert({
    workspace_id: ctx.workspaceId,
    space_id: spaceId,
    grow_run_id: growRunId,
    samples: samples.slice(-2000),
    updated_at: new Date().toISOString(),
  });
}
