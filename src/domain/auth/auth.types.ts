export type WorkspaceRole = 'owner' | 'operator' | 'viewer' | 'admin';

/** Minimal user shape for Supabase + local auth */
export interface AuthUser {
  id: string;
  email?: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  locale?: string;
  activeWorkspaceId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  email?: string;
  displayName?: string;
}

export interface AuthSessionContext {
  userId: string;
  email: string;
  profile: UserProfile;
  workspaces: Workspace[];
  memberships: WorkspaceMember[];
  activeWorkspaceId: string;
  activeRole: WorkspaceRole;
}
