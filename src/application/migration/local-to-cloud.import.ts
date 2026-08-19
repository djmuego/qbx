import { createLocalDemoDataLayer } from '../../data/adapters/local-demo.repository';
import type { LocalDemoDataLayerInstance } from '../../data/adapters/local-demo.repository';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthSessionContext } from '../../domain/auth/auth.types';
import { createSupabaseDataLayer } from '../../data/adapters/supabase/create-supabase-data-layer';

const MIGRATION_KEY = 'qbx_migrated_v1';

export function isLocalMigrated(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MIGRATION_KEY) === userId;
}

export function markLocalMigrated(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MIGRATION_KEY, userId);
}

export interface ImportResult {
  spaces: number;
  devices: number;
  automations: number;
  maps: number;
  plants: number;
}

export async function importLocalStorageToWorkspace(
  client: SupabaseClient,
  authContext: AuthSessionContext,
  targetLayer: LocalDemoDataLayerInstance,
): Promise<ImportResult> {
  const local = createLocalDemoDataLayer();
  const snapshot = local.getSnapshot();
  if (!snapshot.spaces.length && !snapshot.devices.length) {
    return { spaces: 0, devices: 0, automations: 0, maps: 0, plants: 0 };
  }
  await targetLayer.setSnapshot({
    spaces: snapshot.spaces,
    devices: snapshot.devices,
    automations: snapshot.automations,
    settings: { ...snapshot.settings, currentSpaceId: snapshot.settings.currentSpaceId || snapshot.spaces[0]?.id || '' },
    spaceMaps: snapshot.spaceMaps,
    plants: snapshot.plants,
    plantGroups: snapshot.plantGroups,
  });
  markLocalMigrated(authContext.userId);
  return {
    spaces: snapshot.spaces.length,
    devices: snapshot.devices.length,
    automations: snapshot.automations.length,
    maps: snapshot.spaceMaps.length,
    plants: snapshot.plants.length,
  };
}

export async function reloadSupabaseDataLayer(
  client: SupabaseClient,
  authContext: AuthSessionContext,
): Promise<LocalDemoDataLayerInstance> {
  return createSupabaseDataLayer(client, authContext);
}
