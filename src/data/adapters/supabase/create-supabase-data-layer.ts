import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthSessionContext } from '../../../domain/auth/auth.types';
import { createFreshLocalDemoDataLayer, type LocalDemoDataLayerInstance } from '../local-demo.repository';
import type { QbxDataLayer } from '../../contracts/repositories';
import { SupabasePersistenceAdapter } from './supabase.persistence';
import { loadWorkspaceBundle } from './supabase-loader';

export async function createSupabaseDataLayer(
  client: SupabaseClient,
  ctx: AuthSessionContext,
): Promise<LocalDemoDataLayerInstance> {
  const layer = createFreshLocalDemoDataLayer({ skipInitialLoad: true });
  const bundle = await loadWorkspaceBundle(client, ctx.activeWorkspaceId, ctx.userId);
  layer.setPersistenceAdapter(
    new SupabasePersistenceAdapter({
      client,
      workspaceId: ctx.activeWorkspaceId,
      userId: ctx.userId,
    }),
  );
  await layer.setSnapshot({
    spaces: bundle.spaces,
    devices: bundle.devices,
    automations: bundle.automations,
    settings: bundle.settings,
    spaceMaps: bundle.spaceMaps,
    plants: bundle.plants,
    plantGroups: bundle.plantGroups,
  });
  return layer;
}

export type { QbxDataLayer };
