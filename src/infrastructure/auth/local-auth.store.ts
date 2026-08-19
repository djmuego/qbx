import type { UserProfile, Workspace, WorkspaceMember, WorkspaceRole } from '../../domain/auth/auth.types';
import type {
  PlatformAdminGrantRow,
  PlatformAdminStats,
  PlatformAdminSubscriptionRow,
  PlatformAdminUserDetail,
  PlatformAdminUserRow,
  PlatformAdminWorkspaceRow,
  PlatformAdminWorkspaceDetail,
  PlatformAdminWorkspaceIntegrations,
  PlatformAuditLogRow,
} from '../../domain/admin/platform-admin.types';
import { ensureLocalWorkspaceSubscription, getLocalWorkspaceSubscription, setLocalAdminSubscription } from './local-subscription.store';

const USERS_KEY = 'qbx_local_auth_users_v1';
const SESSION_KEY = 'qbx_local_auth_session_v1';
const ACCOUNTS_KEY = 'qbx_local_auth_accounts_v1';
const PLATFORM_ADMINS_KEY = 'qbx_local_platform_admins_v1';
const DISABLED_USERS_KEY = 'qbx_local_disabled_users_v1';
const AUDIT_LOG_KEY = 'qbx_local_platform_audit_v1';

export interface LocalAuthUser {
  id: string;
  email: string;
}

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  createdAt: string;
}

interface StoredSession {
  userId: string;
  email: string;
}

export interface StoredAccount {
  profile: UserProfile;
  workspaces: Workspace[];
  memberships: WorkspaceMember[];
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function users(): StoredUser[] {
  return readJson<StoredUser[]>(USERS_KEY, []);
}

function saveUsers(list: StoredUser[]): void {
  writeJson(USERS_KEY, list);
}

function accounts(): Record<string, StoredAccount> {
  return readJson<Record<string, StoredAccount>>(ACCOUNTS_KEY, {});
}

function saveAccounts(map: Record<string, StoredAccount>): void {
  writeJson(ACCOUNTS_KEY, map);
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120_000, hash: 'SHA-256' },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

async function verifyPassword(password: string, saltB64: string, hashB64: string): Promise<boolean> {
  const salt = fromBase64(saltB64);
  const hash = await hashPassword(password, salt);
  return hash === hashB64;
}

function createDefaultAccount(
  userId: string,
  email: string,
  displayName: string,
  role: WorkspaceRole = 'owner',
): StoredAccount {
  const workspaceId = crypto.randomUUID();
  const workspace: Workspace = { id: workspaceId, name: 'My Farm', ownerId: userId };
  const profile: UserProfile = {
    id: userId,
    displayName,
    locale: 'ru',
    activeWorkspaceId: workspaceId,
  };
  const memberships: WorkspaceMember[] = [
    { workspaceId, userId, role, email, displayName },
  ];
  return { profile, workspaces: [workspace], memberships };
}

async function upsertStoredUser(
  email: string,
  password: string,
  displayName: string,
  role: WorkspaceRole,
): Promise<LocalAuthUser> {
  const normalized = email.trim().toLowerCase();
  const list = users();
  const existingIdx = list.findIndex((u) => u.email === normalized);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPassword(password, salt);

  if (existingIdx >= 0) {
    const existing = list[existingIdx];
    list[existingIdx] = {
      ...existing,
      passwordHash,
      salt: toBase64(salt),
      displayName: displayName.trim() || existing.displayName,
    };
    saveUsers(list);

    const account = getLocalAccount(existing.id);
    if (account) {
      saveLocalAccount(existing.id, {
        ...account,
        profile: { ...account.profile, displayName: displayName.trim() || account.profile.displayName },
        memberships: account.memberships.map((m) =>
          m.userId === existing.id ? { ...m, role, displayName: displayName.trim() || m.displayName } : m,
        ),
      });
    }
    return { id: existing.id, email: normalized };
  }

  const user: StoredUser = {
    id: crypto.randomUUID(),
    email: normalized,
    passwordHash,
    salt: toBase64(salt),
    displayName: displayName.trim(),
    createdAt: new Date().toISOString(),
  };
  list.push(user);
  saveUsers(list);
  saveLocalAccount(user.id, createDefaultAccount(user.id, normalized, user.displayName, role));
  return { id: user.id, email: normalized };
}

/** Bootstrap admin from VITE_QBX_SEED_ADMIN_* env (local auth only). */
export async function ensureLocalAdminUser(
  email: string,
  password: string,
  displayName = 'Admin',
): Promise<void> {
  if (!email.trim() || password.length < 6) return;
  const created = await upsertStoredUser(email, password, displayName, 'admin');
  ensureLocalPlatformAdmin(created.id);
}

function readPlatformAdminIds(): string[] {
  return readJson<string[]>(PLATFORM_ADMINS_KEY, []);
}

function savePlatformAdminIds(ids: string[]): void {
  writeJson(PLATFORM_ADMINS_KEY, ids);
}

export function isLocalPlatformAdmin(userId: string): boolean {
  return readPlatformAdminIds().includes(userId);
}

export function ensureLocalPlatformAdmin(userId: string): void {
  const ids = readPlatformAdminIds();
  if (!ids.includes(userId)) {
    savePlatformAdminIds([...ids, userId]);
  }
}

export function listLocalUsersForAdmin(): PlatformAdminUserRow[] {
  const disabled = readDisabledUserIds();
  return users().map((u) => {
    const account = accounts()[u.id];
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      createdAt: u.createdAt,
      workspaceCount: account?.workspaces.length ?? 0,
      isDisabled: disabled.has(u.id),
      isAuthBanned: disabled.has(u.id),
    };
  });
}

export function listLocalWorkspacesForAdmin(): PlatformAdminWorkspaceRow[] {
  const rows: PlatformAdminWorkspaceRow[] = [];
  for (const account of Object.values(accounts())) {
    for (const ws of account.workspaces) {
      const owner = users().find((u) => u.id === ws.ownerId);
      rows.push({
        id: ws.id,
        name: ws.name,
        ownerId: ws.ownerId,
        ownerEmail: owner?.email ?? null,
        ownerName: owner?.displayName ?? account.profile.displayName,
        memberCount: account.memberships.filter((m) => m.workspaceId === ws.id).length,
        createdAt: owner?.createdAt ?? '',
      });
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function listLocalPlatformAdmins(): PlatformAdminGrantRow[] {
  const ids = readPlatformAdminIds();
  return ids.map((userId) => {
    const u = users().find((x) => x.id === userId);
    return {
      userId,
      email: u?.email ?? null,
      displayName: u?.displayName ?? null,
      createdAt: u?.createdAt ?? '',
    };
  });
}

export function localPlatformAdminStats(): PlatformAdminStats {
  const userList = users();
  const disabled = readDisabledUserIds();
  const subs = listLocalSubscriptionsForAdmin();
  const workspaceIds = new Set<string>();
  for (const account of Object.values(accounts())) {
    for (const ws of account.workspaces) workspaceIds.add(ws.id);
  }
  return {
    userCount: userList.length,
    workspaceCount: workspaceIds.size,
    platformAdminCount: readPlatformAdminIds().length,
    proWorkspaceCount: subs.filter((s) => s.tier === 'pro' || s.tier === 'enterprise' || s.hubLifetime).length,
    trialingCount: subs.filter((s) => s.status === 'trialing').length,
    disabledUserCount: disabled.size,
  };
}

export function listLocalSubscriptionsForAdmin(): PlatformAdminSubscriptionRow[] {
  const seen = new Set<string>();
  const rows: PlatformAdminSubscriptionRow[] = [];
  for (const ws of listLocalWorkspacesForAdmin()) {
    if (seen.has(ws.id)) continue;
    seen.add(ws.id);
    const sub = getLocalWorkspaceSubscription(ws.id);
    rows.push({
      workspaceId: ws.id,
      workspaceName: ws.name,
      ownerEmail: ws.ownerEmail,
      tier: sub.tier,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt,
      hubLifetime: sub.hubLifetime,
      stripeCustomerId: sub.stripeCustomerId,
    });
  }
  return rows;
}

export function setLocalPlatformAdmin(actorId: string, targetUserId: string, grant: boolean): void {
  if (!isLocalPlatformAdmin(actorId)) {
    throw new Error('Forbidden');
  }
  if (!grant && targetUserId === actorId) {
    throw new Error('Cannot revoke your own platform admin');
  }
  const ids = readPlatformAdminIds();
  if (grant) {
    if (!ids.includes(targetUserId)) savePlatformAdminIds([...ids, targetUserId]);
    appendLocalAudit(actorId, grant ? 'platform_admin.grant' : 'platform_admin.revoke', 'user', targetUserId);
    return;
  }
  savePlatformAdminIds(ids.filter((id) => id !== targetUserId));
  appendLocalAudit(actorId, 'platform_admin.revoke', 'user', targetUserId);
}

function readDisabledUserIds(): Set<string> {
  return new Set(readJson<string[]>(DISABLED_USERS_KEY, []));
}

function saveDisabledUserIds(ids: string[]): void {
  writeJson(DISABLED_USERS_KEY, ids);
}

export function isLocalUserDisabled(userId: string): boolean {
  return readDisabledUserIds().has(userId);
}

export function setLocalUserDisabled(actorId: string, targetUserId: string, disabled: boolean): void {
  if (!isLocalPlatformAdmin(actorId)) {
    throw new Error('Forbidden');
  }
  if (targetUserId === actorId) {
    throw new Error('Cannot change your own account status');
  }
  if (isLocalPlatformAdmin(targetUserId)) {
    throw new Error('Revoke platform admin before disabling this user');
  }
  const ids = readDisabledUserIds();
  if (disabled) {
    if (!ids.has(targetUserId)) saveDisabledUserIds([...ids, targetUserId]);
  } else {
    saveDisabledUserIds([...ids].filter((id) => id !== targetUserId));
  }
  appendLocalAudit(actorId, disabled ? 'user.disable' : 'user.enable', 'user', targetUserId);
}

/** Admin V3: local ban mirrors disable (no separate auth.users table). */
export function setLocalUserAuthBan(actorId: string, targetUserId: string, ban: boolean): void {
  if (!isLocalPlatformAdmin(actorId)) {
    throw new Error('Forbidden');
  }
  if (targetUserId === actorId) {
    throw new Error('Cannot change your own account status');
  }
  if (isLocalPlatformAdmin(targetUserId)) {
    throw new Error('Revoke platform admin before banning this user');
  }
  const ids = readDisabledUserIds();
  if (ban) {
    if (!ids.has(targetUserId)) saveDisabledUserIds([...ids, targetUserId]);
  } else {
    saveDisabledUserIds([...ids].filter((id) => id !== targetUserId));
  }
  appendLocalAudit(actorId, ban ? 'user.auth_ban' : 'user.auth_unban', 'user', targetUserId);
}

export function localAdminDeleteWorkspace(actorId: string, workspaceId: string): void {
  if (!isLocalPlatformAdmin(actorId)) {
    throw new Error('Forbidden');
  }
  const map = accounts();
  let found = false;
  let wsName = '';
  for (const account of Object.values(map)) {
    const ws = account.workspaces.find((w) => w.id === workspaceId);
    if (ws) wsName = ws.name;
  }
  for (const [userId, account] of Object.entries(map)) {
    if (!account.workspaces.some((w) => w.id === workspaceId)) continue;
    found = true;
    const workspaces = account.workspaces.filter((w) => w.id !== workspaceId);
    const memberships = account.memberships.filter((m) => m.workspaceId !== workspaceId);
    const activeWorkspaceId =
      account.profile.activeWorkspaceId === workspaceId
        ? workspaces[0]?.id ?? account.profile.activeWorkspaceId
        : account.profile.activeWorkspaceId;
    saveLocalAccount(userId, {
      profile: { ...account.profile, activeWorkspaceId },
      workspaces,
      memberships,
    });
  }
  if (!found) {
    throw new Error('Workspace not found');
  }
  appendLocalAudit(actorId, 'workspace.delete', 'workspace', workspaceId, { name: wsName });
}

export function getLocalWorkspacePayload(workspaceId: string): Record<string, unknown> | null {
  const detail = getLocalWorkspaceDetail(workspaceId);
  if (!detail) return null;
  return {
    workspaceId: detail.id,
    name: detail.name,
    ownerId: detail.ownerId,
    createdAt: detail.createdAt,
    spaces: [],
    devices: [],
    automations: [],
    spatialMaps: [],
    plants: [],
    subscription: null,
    localModeNote: 'Full farm payload is available in cloud mode or via Data → Export JSON.',
  };
}

export function exportLocalMyData(userId: string): Record<string, unknown> {
  const userRecord = users().find((u) => u.id === userId);
  const account = getLocalAccount(userId);
  return {
    exportedAt: new Date().toISOString(),
    profile: userRecord
      ? {
          id: userRecord.id,
          email: userRecord.email,
          displayName: userRecord.displayName,
          locale: account?.profile.locale ?? 'ru',
          createdAt: userRecord.createdAt,
        }
      : null,
    memberships: (account?.memberships ?? []).map((m) => ({
      workspaceId: m.workspaceId,
      role: m.role,
      workspaceName: account?.workspaces.find((w) => w.id === m.workspaceId)?.name ?? '',
    })),
    ownedWorkspaces: (account?.workspaces ?? [])
      .filter((w) => w.ownerId === userId)
      .map((w) => ({ id: w.id, name: w.name })),
  };
}

export function deleteLocalAccount(userId: string, confirmEmail: string): { error?: string } {
  const userRecord = users().find((u) => u.id === userId);
  if (!userRecord || userRecord.email !== confirmEmail.trim().toLowerCase()) {
    return { error: 'Email confirmation does not match' };
  }
  if (isLocalPlatformAdmin(userId)) {
    return { error: 'Transfer platform admin role before deleting account' };
  }

  const account = getLocalAccount(userId);
  const ownedIds = new Set(
    (account?.workspaces ?? []).filter((w) => w.ownerId === userId).map((w) => w.id),
  );

  for (const [accUserId, acc] of Object.entries(accounts())) {
    if (accUserId === userId) continue;
    const workspaces = acc.workspaces.filter((w) => !ownedIds.has(w.id));
    const memberships = acc.memberships.filter(
      (m) => !ownedIds.has(m.workspaceId) && m.userId !== userId,
    );
    const activeWorkspaceId =
      ownedIds.has(acc.profile.activeWorkspaceId) || !workspaces.some((w) => w.id === acc.profile.activeWorkspaceId)
        ? workspaces[0]?.id ?? acc.profile.activeWorkspaceId
        : acc.profile.activeWorkspaceId;
    saveLocalAccount(accUserId, {
      profile: { ...acc.profile, activeWorkspaceId },
      workspaces,
      memberships,
    });
  }

  saveUsers(users().filter((u) => u.id !== userId));
  const accMap = accounts();
  delete accMap[userId];
  saveAccounts(accMap);
  savePlatformAdminIds(readPlatformAdminIds().filter((id) => id !== userId));
  saveDisabledUserIds([...readDisabledUserIds()].filter((id) => id !== userId));

  if (getLocalSession()?.userId === userId) {
    clearLocalSession();
  }
  return {};
}

function readAuditLog(): PlatformAuditLogRow[] {
  return readJson<PlatformAuditLogRow[]>(AUDIT_LOG_KEY, []);
}

function appendLocalAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  meta: Record<string, unknown> = {},
): void {
  const actor = users().find((u) => u.id === actorId);
  const entry: PlatformAuditLogRow = {
    id: crypto.randomUUID(),
    actorId,
    actorEmail: actor?.email ?? null,
    actorName: actor?.displayName ?? null,
    action,
    targetType,
    targetId,
    meta,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...readAuditLog()].slice(0, 200);
  writeJson(AUDIT_LOG_KEY, next);
}

export function listLocalAuditLog(): PlatformAuditLogRow[] {
  return readAuditLog();
}

export function getLocalUserDetail(userId: string): PlatformAdminUserDetail | null {
  const u = users().find((x) => x.id === userId);
  if (!u) return null;
  const account = getLocalAccount(userId);
  const disabled = readDisabledUserIds();
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    locale: account?.profile.locale ?? 'ru',
    createdAt: u.createdAt,
    isDisabled: disabled.has(userId),
    isAuthBanned: disabled.has(userId),
    isPlatformAdmin: isLocalPlatformAdmin(userId),
    memberships: (account?.memberships ?? []).map((m) => ({
      workspaceId: m.workspaceId,
      workspaceName: account?.workspaces.find((w) => w.id === m.workspaceId)?.name ?? '',
      role: m.role,
      joinedAt: u.createdAt,
    })),
    ownedWorkspaces: (account?.workspaces ?? [])
      .filter((w) => w.ownerId === userId)
      .map((w) => ({ id: w.id, name: w.name, createdAt: u.createdAt })),
  };
}

export function exportLocalUserDataForAdmin(userId: string): Record<string, unknown> {
  return {
    ...exportLocalMyData(userId),
    exportedBy: 'platform_admin',
  };
}

export function localAdminDeleteUser(actorId: string, targetUserId: string): void {
  if (!isLocalPlatformAdmin(actorId)) {
    throw new Error('Forbidden');
  }
  if (targetUserId === actorId) {
    throw new Error('Cannot delete your own account');
  }
  const u = users().find((x) => x.id === targetUserId);
  if (!u) throw new Error('User not found');
  const result = deleteLocalAccount(targetUserId, u.email);
  if (result.error) throw new Error(result.error);
  appendLocalAudit(actorId, 'user.delete', 'user', targetUserId, { email: u.email });
}

export function localTransferWorkspaceOwner(
  actorId: string,
  workspaceId: string,
  newOwnerId: string,
): void {
  if (!isLocalPlatformAdmin(actorId)) {
    throw new Error('Forbidden');
  }
  if (!users().some((u) => u.id === newOwnerId)) {
    throw new Error('Target user not found');
  }
  let wsName = '';
  let found = false;
  for (const [userId, account] of Object.entries(accounts())) {
    if (!account.workspaces.some((w) => w.id === workspaceId)) continue;
    found = true;
    const workspaces = account.workspaces.map((w) => {
      if (w.id !== workspaceId) return w;
      wsName = w.name;
      return { ...w, ownerId: newOwnerId };
    });
    let memberships = account.memberships.map((m) => {
      if (m.workspaceId !== workspaceId) return m;
      if (m.userId === newOwnerId) return { ...m, role: 'owner' as WorkspaceRole };
      if (m.role === 'owner') return { ...m, role: 'admin' as WorkspaceRole };
      return m;
    });
    if (!memberships.some((m) => m.workspaceId === workspaceId && m.userId === newOwnerId)) {
      const newUser = users().find((u) => u.id === newOwnerId);
      memberships = [
        ...memberships,
        {
          workspaceId,
          userId: newOwnerId,
          role: 'owner' as WorkspaceRole,
          email: newUser?.email,
          displayName: newUser?.displayName,
        },
      ];
    }
    saveLocalAccount(userId, { ...account, workspaces, memberships });
  }
  if (!found) throw new Error('Workspace not found');
  appendLocalAudit(actorId, 'workspace.transfer_owner', 'workspace', workspaceId, {
    name: wsName,
    newOwnerId,
  });
}

export function getLocalWorkspaceIntegrations(workspaceId: string): PlatformAdminWorkspaceIntegrations {
  return {
    workspaceId,
    payload: {},
    updatedAt: null,
  };
}

export function localRenameWorkspace(actorId: string, workspaceId: string, name: string): void {
  if (!isLocalPlatformAdmin(actorId)) throw new Error('Forbidden');
  const clean = name.trim();
  if (!clean) throw new Error('Name required');
  const map = accounts();
  let oldName = '';
  for (const [userId, account] of Object.entries(map)) {
    const idx = account.workspaces.findIndex((w) => w.id === workspaceId);
    if (idx < 0) continue;
    oldName = account.workspaces[idx].name;
    const workspaces = [...account.workspaces];
    workspaces[idx] = { ...workspaces[idx], name: clean };
    saveLocalAccount(userId, { ...account, workspaces });
  }
  if (!oldName) throw new Error('Workspace not found');
  appendLocalAudit(actorId, 'workspace.rename', 'workspace', workspaceId, { from: oldName, to: clean });
}

export function localSetWorkspaceMemberRole(
  actorId: string,
  workspaceId: string,
  targetUserId: string,
  role: string,
): void {
  if (!isLocalPlatformAdmin(actorId)) throw new Error('Forbidden');
  const memberRole = role as WorkspaceRole;
  const map = accounts();
  for (const [userId, account] of Object.entries(map)) {
    const ws = account.workspaces.find((w) => w.id === workspaceId);
    if (ws?.ownerId === targetUserId) throw new Error('Cannot change owner role');
    const memberships = account.memberships.map((m) =>
      m.workspaceId === workspaceId && m.userId === targetUserId ? { ...m, role: memberRole } : m,
    );
    if (account.memberships !== memberships) {
      saveLocalAccount(userId, { ...account, memberships });
    }
  }
  appendLocalAudit(actorId, 'workspace.member_role', 'workspace', workspaceId, { userId: targetUserId, role });
}

export function localRemoveWorkspaceMember(actorId: string, workspaceId: string, targetUserId: string): void {
  if (!isLocalPlatformAdmin(actorId)) throw new Error('Forbidden');
  const map = accounts();
  for (const [userId, account] of Object.entries(map)) {
    const ws = account.workspaces.find((w) => w.id === workspaceId);
    if (ws?.ownerId === targetUserId) throw new Error('Cannot remove owner');
    const memberships = account.memberships.filter(
      (m) => !(m.workspaceId === workspaceId && m.userId === targetUserId),
    );
    if (memberships.length !== account.memberships.length) {
      saveLocalAccount(userId, { ...account, memberships });
    }
  }
  appendLocalAudit(actorId, 'workspace.member_remove', 'workspace', workspaceId, { userId: targetUserId });
}

export function getLocalWorkspaceDetail(workspaceId: string): PlatformAdminWorkspaceDetail | null {
  const members: PlatformAdminWorkspaceDetail['members'] = [];
  let workspace: { id: string; name: string; ownerId: string; createdAt: string } | null = null;

  for (const account of Object.values(accounts())) {
    const ws = account.workspaces.find((w) => w.id === workspaceId);
    if (!ws) continue;
    workspace = { id: ws.id, name: ws.name, ownerId: ws.ownerId, createdAt: '' };
    for (const m of account.memberships.filter((mem) => mem.workspaceId === workspaceId)) {
      const u = users().find((x) => x.id === m.userId);
      members.push({
        userId: m.userId,
        email: u?.email ?? m.email ?? null,
        displayName: u?.displayName ?? m.displayName ?? null,
        role: m.role,
        joinedAt: u?.createdAt ?? '',
      });
    }
    break;
  }

  if (!workspace) return null;
  const owner = users().find((u) => u.id === workspace.ownerId);
  return {
    id: workspace.id,
    name: workspace.name,
    ownerId: workspace.ownerId,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.displayName ?? null,
    createdAt: workspace.createdAt,
    memberCount: members.length,
    members,
    counts: { spaces: 0, devices: 0, automations: 0, spatialMaps: 0, plants: 0 },
  };
}

export function getLocalSession(): StoredSession | null {
  return readJson<StoredSession | null>(SESSION_KEY, null);
}

export function clearLocalSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function setLocalSession(session: StoredSession): void {
  writeJson(SESSION_KEY, session);
}

export function getLocalAccount(userId: string): StoredAccount | null {
  return accounts()[userId] ?? null;
}

export function saveLocalAccount(userId: string, account: StoredAccount): void {
  const map = accounts();
  map[userId] = account;
  saveAccounts(map);
}

export async function localSignUp(
  email: string,
  password: string,
  displayName: string,
): Promise<{ user?: LocalAuthUser; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (password.length < 6) return { error: 'Password should be at least 6 characters' };
  if (!displayName.trim()) return { error: 'Display name required' };

  const list = users();
  if (list.some((u) => u.email === normalized)) {
    return { error: 'User already registered' };
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await hashPassword(password, salt);
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email: normalized,
    passwordHash,
    salt: toBase64(salt),
    displayName: displayName.trim(),
    createdAt: new Date().toISOString(),
  };
  list.push(user);
  saveUsers(list);

  const account = createDefaultAccount(user.id, normalized, user.displayName);
  saveLocalAccount(user.id, account);
  setLocalSession({ userId: user.id, email: normalized });

  return { user: { id: user.id, email: normalized } };
}

export async function localSignIn(
  email: string,
  password: string,
): Promise<{ user?: LocalAuthUser; error?: string }> {
  const normalized = email.trim().toLowerCase();
  const record = users().find((u) => u.email === normalized);
  if (!record) return { error: 'Invalid login credentials' };
  if (isLocalUserDisabled(record.id)) return { error: 'Account disabled' };

  const ok = await verifyPassword(password, record.salt, record.passwordHash);
  if (!ok) return { error: 'Invalid login credentials' };

  setLocalSession({ userId: record.id, email: normalized });
  return { user: { id: record.id, email: normalized } };
}

export async function localChangePassword(
  userId: string,
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const check = await localSignIn(email, currentPassword);
  if (check.error) return { error: 'Invalid login credentials' };
  if (check.user?.id !== userId) return { error: 'User not found' };
  return localUpdatePassword(userId, newPassword);
}

export async function localUpdatePassword(userId: string, password: string): Promise<{ error?: string }> {
  if (password.length < 6) return { error: 'Password should be at least 6 characters' };
  const list = users();
  const idx = list.findIndex((u) => u.id === userId);
  if (idx < 0) return { error: 'User not found' };

  const salt = crypto.getRandomValues(new Uint8Array(16));
  list[idx] = {
    ...list[idx],
    passwordHash: await hashPassword(password, salt),
    salt: toBase64(salt),
  };
  saveUsers(list);
  return {};
}

export function localUpdateDisplayName(userId: string, name: string): StoredAccount | null {
  const account = getLocalAccount(userId);
  if (!account) return null;
  const next: StoredAccount = {
    ...account,
    profile: { ...account.profile, displayName: name },
    memberships: account.memberships.map((m) =>
      m.userId === userId ? { ...m, displayName: name } : m,
    ),
  };
  saveLocalAccount(userId, next);
  return next;
}

export function localSetActiveWorkspace(userId: string, workspaceId: string): StoredAccount | null {
  const account = getLocalAccount(userId);
  if (!account) return null;
  if (!account.workspaces.some((w) => w.id === workspaceId)) return null;
  const next: StoredAccount = {
    ...account,
    profile: { ...account.profile, activeWorkspaceId: workspaceId },
  };
  saveLocalAccount(userId, next);
  return next;
}

export function localCreateWorkspace(userId: string, name: string): StoredAccount | null {
  const account = getLocalAccount(userId);
  if (!account) return null;
  const workspaceId = crypto.randomUUID();
  const workspace: Workspace = { id: workspaceId, name: name.trim() || 'My Farm', ownerId: userId };
  const next: StoredAccount = {
    profile: { ...account.profile, activeWorkspaceId: workspaceId },
    workspaces: [...account.workspaces, workspace],
    memberships: [
      ...account.memberships,
      { workspaceId, userId, role: 'owner', email: account.memberships[0]?.email, displayName: account.profile.displayName },
    ],
  };
  saveLocalAccount(userId, next);
  ensureLocalWorkspaceSubscription(workspaceId);
  return next;
}

export function localDeleteWorkspace(userId: string, workspaceId: string): StoredAccount | null {
  const account = getLocalAccount(userId);
  if (!account) return null;
  if (account.workspaces.length <= 1) return null;
  const workspaces = account.workspaces.filter((w) => w.id !== workspaceId);
  const memberships = account.memberships.filter((m) => m.workspaceId !== workspaceId);
  const activeWorkspaceId =
    account.profile.activeWorkspaceId === workspaceId
      ? workspaces[0]?.id
      : account.profile.activeWorkspaceId;
  const next: StoredAccount = {
    profile: { ...account.profile, activeWorkspaceId },
    workspaces,
    memberships,
  };
  saveLocalAccount(userId, next);
  return next;
}

export function localUpdateLocale(userId: string, locale: string): StoredAccount | null {
  const account = getLocalAccount(userId);
  if (!account) return null;
  const next: StoredAccount = {
    ...account,
    profile: { ...account.profile, locale },
  };
  saveLocalAccount(userId, next);
  return next;
}

export function localUpdateWorkspaceName(
  userId: string,
  workspaceId: string,
  name: string,
): StoredAccount | null {
  const account = getLocalAccount(userId);
  if (!account) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const next: StoredAccount = {
    ...account,
    workspaces: account.workspaces.map((w) =>
      w.id === workspaceId ? { ...w, name: trimmed } : w,
    ),
  };
  saveLocalAccount(userId, next);
  return next;
}

export function localSignOut(): void {
  clearLocalSession();
}

/** Dev-only: clear all local auth data */
export function clearLocalAuthData(): void {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ACCOUNTS_KEY);
  localStorage.removeItem(PLATFORM_ADMINS_KEY);
  localStorage.removeItem(DISABLED_USERS_KEY);
  localStorage.removeItem(AUDIT_LOG_KEY);
}
