import type { WorkspaceRole } from './auth.types';

export function canEditMap(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'operator' || role === 'admin';
}

export function canToggleOutput(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'operator' || role === 'admin';
}

export function canManageAutomations(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'operator' || role === 'admin';
}

export function canManageDevices(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'operator' || role === 'admin';
}

export function canDeleteSpace(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function isReadOnlyRole(role: WorkspaceRole): boolean {
  return role === 'viewer';
}
