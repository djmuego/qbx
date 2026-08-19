import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PlatformAdminGrantRow,
  PlatformAdminStats,
  PlatformAdminSubscriptionRow,
  PlatformAdminUserDetail,
  PlatformAdminUserRow,
  PlatformAdminWorkspaceIntegrations,
  PlatformAdminWorkspaceRow,
  PlatformAdminWorkspaceDetail,
  PlatformAdminWorkspacePayload,
  PlatformAdminWorkspaceSubscription,
  PlatformAuditLogRow,
} from '../../../domain/admin/platform-admin.types';

export async function checkPlatformAdmin(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc('is_platform_admin');
  if (error) return false;
  return Boolean(data);
}

/** One-time bootstrap when platform_admins is empty (see migration 003). */
export async function tryBootstrapPlatformAdmin(
  client: SupabaseClient,
  email: string | undefined,
): Promise<boolean> {
  const seed = import.meta.env.VITE_QBX_SEED_ADMIN_EMAIL as string | undefined;
  if (!seed?.trim() || !email) return false;
  if (email.trim().toLowerCase() !== seed.trim().toLowerCase()) return false;
  const { data, error } = await client.rpc('bootstrap_platform_admin_by_email', {
    target_email: email.trim().toLowerCase(),
  });
  if (error) {
    // Already bootstrapped or RPC missing — ignore
    return false;
  }
  return Boolean(data);
}

export async function fetchPlatformAdminStats(client: SupabaseClient): Promise<PlatformAdminStats> {
  const { data, error } = await client.rpc('admin_platform_stats');
  if (error) throw new Error(error.message);
  const raw = (data ?? {}) as Record<string, number>;
  return {
    userCount: raw.userCount ?? 0,
    workspaceCount: raw.workspaceCount ?? 0,
    platformAdminCount: raw.platformAdminCount ?? 0,
    proWorkspaceCount: raw.proWorkspaceCount ?? 0,
    trialingCount: raw.trialingCount ?? 0,
    disabledUserCount: raw.disabledUserCount ?? 0,
  };
}

export async function fetchAdminUsers(client: SupabaseClient): Promise<PlatformAdminUserRow[]> {
  const { data, error } = await client.rpc('admin_list_users');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    email: (row.email as string | null) ?? null,
    displayName: String(row.display_name ?? ''),
    createdAt: String(row.created_at ?? ''),
    workspaceCount: Number(row.workspace_count ?? 0),
    isDisabled: Boolean(row.is_disabled),
    isAuthBanned: Boolean(row.is_auth_banned),
  }));
}

export async function fetchAdminWorkspaces(client: SupabaseClient): Promise<PlatformAdminWorkspaceRow[]> {
  const { data, error } = await client.rpc('admin_list_workspaces');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    ownerId: String(row.owner_id ?? ''),
    ownerEmail: (row.owner_email as string | null) ?? null,
    ownerName: (row.owner_name as string | null) ?? null,
    memberCount: Number(row.member_count ?? 0),
    createdAt: String(row.created_at ?? ''),
  }));
}

export async function fetchPlatformAdmins(client: SupabaseClient): Promise<PlatformAdminGrantRow[]> {
  const { data, error } = await client.rpc('admin_list_platform_admins');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    userId: String(row.user_id),
    email: (row.email as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    createdAt: String(row.created_at ?? ''),
  }));
}

export async function setPlatformAdminGrant(
  client: SupabaseClient,
  userId: string,
  grant: boolean,
): Promise<void> {
  const { error } = await client.rpc('admin_set_platform_admin', {
    target_user_id: userId,
    grant_admin: grant,
  });
  if (error) throw new Error(error.message);
}

export async function setUserDisabled(
  client: SupabaseClient,
  userId: string,
  disabled: boolean,
): Promise<void> {
  const { error } = await client.rpc('admin_set_user_disabled', {
    target_user_id: userId,
    disabled_flag: disabled,
  });
  if (error) throw new Error(error.message);
}

/** Ban via Supabase Auth + profiles.is_disabled (Admin V3). */
export async function banUser(client: SupabaseClient, userId: string, ban: boolean): Promise<void> {
  const { error } = await client.rpc('admin_ban_user', {
    target_user_id: userId,
    ban,
  });
  if (error) throw new Error(error.message);
}

export async function adminDeleteWorkspace(client: SupabaseClient, workspaceId: string): Promise<void> {
  const { error } = await client.rpc('admin_delete_workspace', { ws_id: workspaceId });
  if (error) throw new Error(error.message);
}

export async function fetchWorkspacePayload(
  client: SupabaseClient,
  workspaceId: string,
): Promise<PlatformAdminWorkspacePayload | null> {
  const { data, error } = await client.rpc('admin_get_workspace_payload', { ws_id: workspaceId });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const raw = data as Record<string, unknown>;
  return {
    workspaceId: String(raw.workspaceId ?? workspaceId),
    name: String(raw.name ?? ''),
    ownerId: String(raw.ownerId ?? ''),
    createdAt: String(raw.createdAt ?? ''),
    spaces: (raw.spaces as PlatformAdminWorkspacePayload['spaces']) ?? [],
    devices: (raw.devices as PlatformAdminWorkspacePayload['devices']) ?? [],
    automations: (raw.automations as PlatformAdminWorkspacePayload['automations']) ?? [],
    spatialMaps: (raw.spatialMaps as PlatformAdminWorkspacePayload['spatialMaps']) ?? [],
    plants: (raw.plants as PlatformAdminWorkspacePayload['plants']) ?? [],
    subscription: (raw.subscription as Record<string, unknown> | null) ?? null,
  };
}

export async function exportAuditLog(client: SupabaseClient): Promise<PlatformAuditLogRow[]> {
  const { data, error } = await client.rpc('admin_export_audit_log');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    actorId: (row.actorId as string | null) ?? null,
    actorEmail: (row.actorEmail as string | null) ?? null,
    actorName: null,
    action: String(row.action ?? ''),
    targetType: String(row.targetType ?? ''),
    targetId: (row.targetId as string | null) ?? null,
    meta: (row.meta as Record<string, unknown>) ?? {},
    createdAt: String(row.createdAt ?? ''),
  }));
}

export async function fetchWorkspaceDetail(
  client: SupabaseClient,
  workspaceId: string,
): Promise<PlatformAdminWorkspaceDetail | null> {
  const { data, error } = await client.rpc('admin_get_workspace_detail', { ws_id: workspaceId });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const raw = data as Record<string, unknown>;
  const counts = (raw.counts ?? {}) as Record<string, number>;
  const members = Array.isArray(raw.members) ? raw.members : [];
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    ownerId: String(raw.ownerId ?? ''),
    ownerEmail: (raw.ownerEmail as string | null) ?? null,
    ownerName: (raw.ownerName as string | null) ?? null,
    createdAt: String(raw.createdAt ?? ''),
    memberCount: Number(raw.memberCount ?? 0),
    members: members.map((m: Record<string, unknown>) => ({
      userId: String(m.userId),
      email: (m.email as string | null) ?? null,
      displayName: (m.displayName as string | null) ?? null,
      role: String(m.role ?? ''),
      joinedAt: String(m.joinedAt ?? ''),
    })),
    counts: {
      spaces: Number(counts.spaces ?? 0),
      devices: Number(counts.devices ?? 0),
      automations: Number(counts.automations ?? 0),
      spatialMaps: Number(counts.spatialMaps ?? 0),
      plants: Number(counts.plants ?? 0),
    },
  };
}

export async function fetchAuditLog(client: SupabaseClient, limit = 100): Promise<PlatformAuditLogRow[]> {
  const { data, error } = await client.rpc('admin_list_audit_log', { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    actorId: (row.actor_id as string | null) ?? null,
    actorEmail: (row.actor_email as string | null) ?? null,
    actorName: (row.actor_name as string | null) ?? null,
    action: String(row.action ?? ''),
    targetType: String(row.target_type ?? ''),
    targetId: (row.target_id as string | null) ?? null,
    meta: (row.meta as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at ?? ''),
  }));
}

export async function checkUserDisabled(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client.from('profiles').select('is_disabled').eq('id', userId).maybeSingle();
  if (error || !data) return false;
  return Boolean(data.is_disabled);
}

export async function setHubLifetime(
  client: SupabaseClient,
  workspaceId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await client.rpc('admin_set_hub_lifetime', {
    ws_id: workspaceId,
    enabled,
  });
  if (error) throw new Error(error.message);
}

export async function fetchWorkspaceSubscriptionAdmin(
  client: SupabaseClient,
  workspaceId: string,
): Promise<PlatformAdminWorkspaceSubscription> {
  const { data, error } = await client.rpc('admin_get_workspace_subscription', { ws_id: workspaceId });
  if (error) throw new Error(error.message);
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    hubLifetime: Boolean(raw.hubLifetime),
    tier: String(raw.tier ?? 'free'),
    status: String(raw.status ?? 'trialing'),
    trialEndsAt: (raw.trialEndsAt as string | null) ?? null,
    stripeCustomerId: (raw.stripeCustomerId as string | null) ?? null,
  };
}

export async function fetchAdminSubscriptions(
  client: SupabaseClient,
): Promise<PlatformAdminSubscriptionRow[]> {
  const { data, error } = await client.rpc('admin_list_subscriptions');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    workspaceId: String(row.workspace_id),
    workspaceName: String(row.workspace_name ?? ''),
    ownerEmail: (row.owner_email as string | null) ?? null,
    tier: String(row.tier ?? 'free'),
    status: String(row.status ?? 'trialing'),
    trialEndsAt: (row.trial_ends_at as string | null) ?? null,
    hubLifetime: Boolean(row.hub_lifetime),
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
  }));
}

export async function setAdminSubscription(
  client: SupabaseClient,
  workspaceId: string,
  opts: {
    tier?: string;
    status?: string;
    trialEndsAt?: string | null;
    extendTrialDays?: number;
  },
): Promise<void> {
  const { error } = await client.rpc('admin_set_subscription', {
    ws_id: workspaceId,
    p_tier: opts.tier ?? null,
    p_status: opts.status ?? null,
    p_trial_ends_at: opts.trialEndsAt ?? null,
    p_extend_trial_days: opts.extendTrialDays ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchAdminUserDetail(
  client: SupabaseClient,
  userId: string,
): Promise<PlatformAdminUserDetail | null> {
  const { data, error } = await client.rpc('admin_get_user_detail', { target_user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const raw = data as Record<string, unknown>;
  const memberships = Array.isArray(raw.memberships) ? raw.memberships : [];
  const owned = Array.isArray(raw.ownedWorkspaces) ? raw.ownedWorkspaces : [];
  return {
    id: String(raw.id),
    email: (raw.email as string | null) ?? null,
    displayName: String(raw.displayName ?? ''),
    locale: (raw.locale as string | null) ?? null,
    createdAt: String(raw.createdAt ?? ''),
    isDisabled: Boolean(raw.isDisabled),
    isAuthBanned: Boolean(raw.isAuthBanned),
    isPlatformAdmin: Boolean(raw.isPlatformAdmin),
    memberships: memberships.map((m: Record<string, unknown>) => ({
      workspaceId: String(m.workspaceId),
      workspaceName: String(m.workspaceName ?? ''),
      role: String(m.role ?? ''),
      joinedAt: String(m.joinedAt ?? ''),
    })),
    ownedWorkspaces: owned.map((w: Record<string, unknown>) => ({
      id: String(w.id),
      name: String(w.name ?? ''),
      createdAt: String(w.createdAt ?? ''),
    })),
  };
}

export async function exportAdminUserData(
  client: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await client.rpc('admin_export_user_data', { target_user_id: userId });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function adminDeleteUser(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.rpc('admin_delete_user', { target_user_id: userId });
  if (error) throw new Error(error.message);
}

export async function transferWorkspaceOwner(
  client: SupabaseClient,
  workspaceId: string,
  newOwnerId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_transfer_workspace_owner', {
    ws_id: workspaceId,
    new_owner_id: newOwnerId,
  });
  if (error) throw new Error(error.message);
}

export async function fetchWorkspaceIntegrationsAdmin(
  client: SupabaseClient,
  workspaceId: string,
): Promise<PlatformAdminWorkspaceIntegrations> {
  const { data, error } = await client.rpc('admin_get_workspace_integrations', { ws_id: workspaceId });
  if (error) throw new Error(error.message);
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    workspaceId: String(raw.workspaceId ?? workspaceId),
    payload: (raw.payload as Record<string, unknown>) ?? {},
    updatedAt: (raw.updatedAt as string | null) ?? null,
  };
}

export async function fetchWorkspaceAiConfigAdmin(
  client: SupabaseClient,
  workspaceId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await client.rpc('admin_get_workspace_ai_config', { ws_id: workspaceId });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function setWorkspaceAiConfigAdmin(
  client: SupabaseClient,
  workspaceId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.rpc('admin_set_workspace_ai_config', {
    ws_id: workspaceId,
    config_payload: payload,
  });
  if (error) throw new Error(error.message);
}

export async function fetchPlatformConsciousnessAdmin(
  client: SupabaseClient,
): Promise<Record<string, unknown>> {
  const { data, error } = await client.rpc('admin_get_platform_consciousness');
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, unknown>;
}

export async function setPlatformConsciousnessAdmin(
  client: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.rpc('admin_set_platform_consciousness', {
    config_payload: payload,
  });
  if (error) throw new Error(error.message);
}

export async function renameWorkspaceAdmin(
  client: SupabaseClient,
  workspaceId: string,
  name: string,
): Promise<void> {
  const { data, error } = await client.rpc('admin_rename_workspace', {
    p_ws_id: workspaceId,
    p_name: name,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Workspace not found');
}

export async function setWorkspaceMemberRoleAdmin(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
  role: string,
): Promise<void> {
  const { error } = await client.rpc('admin_set_workspace_member_role', {
    p_ws_id: workspaceId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(error.message);
}

export async function removeWorkspaceMemberAdmin(
  client: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_remove_workspace_member', {
    p_ws_id: workspaceId,
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

export async function fetchAuditLogFiltered(
  client: SupabaseClient,
  opts: { action?: string; targetType?: string; search?: string; offset?: number; limit?: number },
): Promise<import('../../../domain/admin/platform-admin.types').PlatformAuditLogPage> {
  const { data, error } = await client.rpc('admin_list_audit_log_filtered', {
    p_action: opts.action || null,
    p_target_type: opts.targetType || null,
    p_search: opts.search || null,
    p_offset: opts.offset ?? 0,
    p_limit: opts.limit ?? 50,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;
  return {
    totalCount,
    rows: rows.map((row) => ({
      id: String(row.id),
      actorId: row.actor_id ? String(row.actor_id) : null,
      actorEmail: (row.actor_email as string | null) ?? null,
      actorName: (row.actor_name as string | null) ?? null,
      action: String(row.action ?? ''),
      targetType: String(row.target_type ?? ''),
      targetId: row.target_id ? String(row.target_id) : null,
      meta: (row.meta as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at ?? ''),
    })),
  };
}

export async function fetchKnowledgeStatsAdmin(
  client: SupabaseClient,
): Promise<import('../../../domain/admin/platform-admin.types').PlatformAdminKnowledgeStats> {
  const { data, error } = await client.rpc('admin_knowledge_stats');
  if (error) throw new Error(error.message);
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    articleCount: Number(raw.articleCount ?? 0),
    publishedCount: Number(raw.publishedCount ?? 0),
    chunkCount: Number(raw.chunkCount ?? 0),
    categoryCount: Number(raw.categoryCount ?? 0),
    lastArticleUpdate: (raw.lastArticleUpdate as string | null) ?? null,
  };
}

export async function fetchWorkspaceAiOverviewAdmin(
  client: SupabaseClient,
): Promise<import('../../../domain/admin/platform-admin.types').PlatformAdminAiFarmRow[]> {
  const { data, error } = await client.rpc('admin_list_workspace_ai_overview');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    workspaceId: String(row.workspace_id),
    workspaceName: String(row.workspace_name ?? ''),
    ownerEmail: (row.owner_email as string | null) ?? null,
    managedByPlatform: Boolean(row.managed_by_platform),
    aiEnabled: Boolean(row.ai_enabled),
    provider: String(row.provider ?? 'deepseek'),
    updatedAt: (row.updated_at as string | null) ?? null,
  }));
}
