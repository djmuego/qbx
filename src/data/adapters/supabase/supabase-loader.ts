import type { SupabaseClient } from '@supabase/supabase-js';
import type { Space } from '../../../domain/space/space.types';
import type { Device } from '../../../domain/device/device.types';
import type { Automation } from '../../../domain/automation/automation.types';
import type { AppSettings } from '../../../domain/settings/settings.types';
import type { SpaceMap } from '../../../domain/map/space-map.types';
import type { Plant, PlantGroup } from '../../../domain/grow/plant.types';
import type { UserProfile, Workspace, WorkspaceMember } from '../../../domain/auth/auth.types';
import { getDefaultSettings } from '../../../mock/seed.defaults';

export interface WorkspaceDataBundle {
  spaces: Space[];
  devices: Device[];
  automations: Automation[];
  settings: AppSettings;
  spaceMaps: SpaceMap[];
  plants: Plant[];
  plantGroups: PlantGroup[];
}

export async function loadUserProfile(client: SupabaseClient, userId: string): Promise<UserProfile | null> {
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    displayName: data.display_name ?? '',
    avatarUrl: data.avatar_url ?? undefined,
    locale: data.locale ?? 'ru',
    activeWorkspaceId: data.active_workspace_id ?? undefined,
  };
}

export async function loadUserWorkspaces(client: SupabaseClient, userId: string): Promise<{
  workspaces: Workspace[];
  memberships: WorkspaceMember[];
}> {
  const { data: members, error } = await client
    .from('workspace_members')
    .select('workspace_id, user_id, role, workspaces(id, name, owner_id)')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const workspaces: Workspace[] = [];
  const memberships: WorkspaceMember[] = [];
  for (const row of members ?? []) {
    const raw = row.workspaces as { id: string; name: string; owner_id: string } | { id: string; name: string; owner_id: string }[] | null;
    const ws = Array.isArray(raw) ? raw[0] : raw;
    if (!ws) continue;
    workspaces.push({ id: ws.id, name: ws.name, ownerId: ws.owner_id });
    memberships.push({
      workspaceId: row.workspace_id,
      userId: row.user_id,
      role: row.role as WorkspaceMember['role'],
    });
  }
  return { workspaces, memberships };
}

export async function loadWorkspaceBundle(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceDataBundle> {
  const [spacesRes, devicesRes, automationsRes, mapsRes, plantsRes, groupsRes, prefsRes] = await Promise.all([
    client.from('spaces').select('payload').eq('workspace_id', workspaceId),
    client.from('devices').select('payload').eq('workspace_id', workspaceId),
    client.from('automations').select('payload').eq('workspace_id', workspaceId),
    client.from('spatial_maps').select('payload').eq('workspace_id', workspaceId),
    client.from('plants').select('payload').eq('workspace_id', workspaceId),
    client.from('plant_groups').select('payload').eq('workspace_id', workspaceId),
    client.from('user_preferences').select('payload').eq('workspace_id', workspaceId).eq('user_id', userId).maybeSingle(),
  ]);

  const throwIf = (label: string, error: { message: string } | null) => {
    if (error) throw new Error(`${label}: ${error.message}`);
  };
  throwIf('spaces', spacesRes.error);
  throwIf('devices', devicesRes.error);
  throwIf('automations', automationsRes.error);
  throwIf('maps', mapsRes.error);
  throwIf('plants', plantsRes.error);
  throwIf('groups', groupsRes.error);
  throwIf('prefs', prefsRes.error);

  const spaces = (spacesRes.data ?? []).map((r) => r.payload as Space);
  const defaultSettings = { ...getDefaultSettings(), currentSpaceId: spaces[0]?.id ?? '' };
  const settings = (prefsRes.data?.payload as AppSettings | undefined) ?? defaultSettings;

  return {
    spaces,
    devices: (devicesRes.data ?? []).map((r) => r.payload as Device),
    automations: (automationsRes.data ?? []).map((r) => r.payload as Automation),
    settings,
    spaceMaps: (mapsRes.data ?? []).map((r) => r.payload as SpaceMap),
    plants: (plantsRes.data ?? []).map((r) => r.payload as Plant),
    plantGroups: (groupsRes.data ?? []).map((r) => r.payload as PlantGroup),
  };
}

export async function updateProfileActiveWorkspace(
  client: SupabaseClient,
  userId: string,
  workspaceId: string,
): Promise<void> {
  await client.from('profiles').update({ active_workspace_id: workspaceId }).eq('id', userId);
}

export async function updateWorkspaceName(client: SupabaseClient, workspaceId: string, name: string): Promise<void> {
  await client.from('workspaces').update({ name, updated_at: new Date().toISOString() }).eq('id', workspaceId);
}

export async function listWorkspaceMembers(client: SupabaseClient, workspaceId: string): Promise<WorkspaceMember[]> {
  const { data, error } = await client
    .from('workspace_members')
    .select('workspace_id, user_id, role, profiles(display_name, email)')
    .eq('workspace_id', workspaceId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const prof = r.profiles as { display_name?: string; email?: string } | { display_name?: string; email?: string }[] | null;
    const profile = Array.isArray(prof) ? prof[0] : prof;
    return {
      workspaceId: r.workspace_id,
      userId: r.user_id,
      role: r.role as WorkspaceMember['role'],
      displayName: profile?.display_name ?? undefined,
      email: profile?.email ?? undefined,
    };
  });
}

export async function upsertWorkspaceMember(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
  role: WorkspaceMember['role'],
): Promise<void> {
  const { error } = await client.from('workspace_members').upsert(
    { workspace_id: workspaceId, user_id: userId, role },
    { onConflict: 'workspace_id,user_id' },
  );
  if (error) throw new Error(error.message);
}

export async function removeWorkspaceMember(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function findUserIdByEmail(client: SupabaseClient, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const { data, error } = await client.rpc('lookup_user_id_by_email', { target_email: normalized });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

export async function createWorkspace(
  client: SupabaseClient,
  userId: string,
  name: string,
): Promise<Workspace> {
  const { data, error } = await client
    .from('workspaces')
    .insert({ name: name.trim() || 'My Farm', owner_id: userId })
    .select('id, name, owner_id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to create workspace');

  await upsertWorkspaceMember(client, data.id, userId, 'owner');
  await client.from('user_preferences').upsert({
    workspace_id: data.id,
    user_id: userId,
    payload: {
      theme: 'system',
      tempUnit: 'C',
      growPhase: 'vegetative',
      currentSpaceId: '',
      mapViewMode: '2d',
    },
  });

  return { id: data.id, name: data.name, ownerId: data.owner_id };
}

export async function deleteWorkspace(client: SupabaseClient, workspaceId: string): Promise<void> {
  const { error } = await client.from('workspaces').delete().eq('id', workspaceId);
  if (error) throw new Error(error.message);
}

export async function updateMemberRole(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
  role: WorkspaceMember['role'],
): Promise<void> {
  await upsertWorkspaceMember(client, workspaceId, userId, role);
}
