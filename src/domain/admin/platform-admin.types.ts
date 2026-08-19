export interface PlatformAdminStats {
  userCount: number;
  workspaceCount: number;
  platformAdminCount: number;
  proWorkspaceCount?: number;
  trialingCount?: number;
  disabledUserCount?: number;
}

export interface PlatformAdminUserRow {
  id: string;
  email: string | null;
  displayName: string;
  createdAt: string;
  workspaceCount: number;
  isDisabled: boolean;
  isAuthBanned: boolean;
}

export interface PlatformAdminWorkspaceRow {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerName: string | null;
  memberCount: number;
  createdAt: string;
}

export interface PlatformAdminGrantRow {
  userId: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
}

export interface PlatformAdminWorkspaceMemberRow {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: string;
  joinedAt: string;
}

export interface PlatformAdminWorkspaceDetail {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string | null;
  ownerName: string | null;
  createdAt: string;
  memberCount: number;
  members: PlatformAdminWorkspaceMemberRow[];
  counts: {
    spaces: number;
    devices: number;
    automations: number;
    spatialMaps: number;
    plants: number;
  };
}

export interface PlatformAuditLogRow {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export type AdminPanelTab =
  | 'overview'
  | 'users'
  | 'workspaces'
  | 'subscriptions'
  | 'consciousness'
  | 'knowledge'
  | 'aiFarms'
  | 'platformAdmins'
  | 'audit';

export interface PlatformAdminKnowledgeStats {
  articleCount: number;
  publishedCount: number;
  chunkCount: number;
  categoryCount: number;
  lastArticleUpdate: string | null;
}

export interface PlatformAdminAiFarmRow {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string | null;
  managedByPlatform: boolean;
  aiEnabled: boolean;
  provider: string;
  updatedAt: string | null;
}

export interface PlatformAuditLogPage {
  rows: PlatformAuditLogRow[];
  totalCount: number;
}

export interface PlatformAdminSubscriptionRow {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string | null;
  tier: string;
  status: string;
  trialEndsAt: string | null;
  hubLifetime: boolean;
  stripeCustomerId: string | null;
}

export interface PlatformAdminUserMembershipRow {
  workspaceId: string;
  workspaceName: string;
  role: string;
  joinedAt: string;
}

export interface PlatformAdminUserDetail {
  id: string;
  email: string | null;
  displayName: string;
  locale: string | null;
  createdAt: string;
  isDisabled: boolean;
  isAuthBanned: boolean;
  isPlatformAdmin: boolean;
  memberships: PlatformAdminUserMembershipRow[];
  ownedWorkspaces: Array<{ id: string; name: string; createdAt: string }>;
}

export interface PlatformAdminWorkspaceIntegrations {
  workspaceId: string;
  payload: Record<string, unknown>;
  updatedAt: string | null;
}

export interface PlatformAdminWorkspaceSubscription {
  hubLifetime: boolean;
  tier: string;
  status: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
}

/** Read-only farm payload for platform admin (Supabase JSONB rows). */
export interface PlatformAdminWorkspacePayload {
  workspaceId: string;
  name: string;
  ownerId: string;
  createdAt: string;
  spaces: Array<{ id: string; payload: unknown }>;
  devices: Array<{ id: string; spaceId: string | null; payload: unknown }>;
  automations: Array<{ id: string; spaceId: string | null; payload: unknown }>;
  spatialMaps: Array<{ spaceId: string; payload: unknown }>;
  plants: Array<{ id: string; spaceId: string | null; payload: unknown }>;
  subscription: Record<string, unknown> | null;
}
