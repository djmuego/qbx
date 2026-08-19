import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  clearLocalAuthData,
  getLocalSession,
  localSignIn,
  localSignOut,
  localSignUp,
  hashPassword,
  ensureLocalAdminUser,
  getLocalAccount,
} from './local-auth.store';

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  vi.stubGlobal('localStorage', ls);
  return store;
}

describe('local-auth.store', () => {
  beforeEach(() => {
    mockLocalStorage();
    clearLocalAuthData();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers and signs in', async () => {
    const signUp = await localSignUp('farmer@qbx.test', 'secret12', 'Farmer');
    expect(signUp.error).toBeUndefined();
    expect(signUp.user?.email).toBe('farmer@qbx.test');

    localSignOut();
    const signIn = await localSignIn('farmer@qbx.test', 'secret12');
    expect(signIn.error).toBeUndefined();
    expect(getLocalSession()?.email).toBe('farmer@qbx.test');
  });

  it('rejects duplicate email', async () => {
    await localSignUp('a@test.com', 'pass1234', 'A');
    const dup = await localSignUp('a@test.com', 'pass1234', 'B');
    expect(dup.error).toContain('already');
  });

  it('rejects wrong password', async () => {
    await localSignUp('a@test.com', 'pass1234', 'A');
    const bad = await localSignIn('a@test.com', 'wrongpass');
    expect(bad.error).toBeDefined();
  });

  it('hashes passwords deterministically with salt', async () => {
    const salt = new Uint8Array([1, 2, 3, 4]);
    const a = await hashPassword('test', salt);
    const b = await hashPassword('test', salt);
    expect(a).toBe(b);
  });

  it('seeds admin user with admin role', async () => {
    await ensureLocalAdminUser('admin@test.com', 'adminpass1', 'Admin');
    const signIn = await localSignIn('admin@test.com', 'adminpass1');
    expect(signIn.user?.email).toBe('admin@test.com');
    const account = getLocalAccount(signIn.user!.id);
    expect(account?.memberships[0]?.role).toBe('admin');
    const { isLocalPlatformAdmin } = await import('./local-auth.store');
    expect(isLocalPlatformAdmin(signIn.user!.id)).toBe(true);
  });

  it('platform admin can rename workspace and change member role', async () => {
    const {
      localRenameWorkspace,
      localSetWorkspaceMemberRole,
      localRemoveWorkspaceMember,
      getLocalWorkspaceDetail,
      saveLocalAccount,
    } = await import('./local-auth.store');

    await ensureLocalAdminUser('admin@test.com', 'adminpass1', 'Admin');
    const admin = await localSignIn('admin@test.com', 'adminpass1');
    const adminId = admin.user!.id;
    const adminWsId = getLocalAccount(adminId)!.workspaces[0].id;

    await localSignUp('operator@test.com', 'operator12', 'Op');
    const op = await localSignIn('operator@test.com', 'operator12');
    const opId = op.user!.id;

    const opAccount = getLocalAccount(opId)!;
    saveLocalAccount(opId, {
      ...opAccount,
      memberships: [
        ...opAccount.memberships,
        { workspaceId: adminWsId, userId: opId, role: 'viewer', email: 'operator@test.com', displayName: 'Op' },
      ],
    });
    const adminAccount = getLocalAccount(adminId)!;
    saveLocalAccount(adminId, {
      ...adminAccount,
      memberships: [
        ...adminAccount.memberships,
        { workspaceId: adminWsId, userId: opId, role: 'viewer', email: 'operator@test.com', displayName: 'Op' },
      ],
    });

    localRenameWorkspace(adminId, adminWsId, 'Renamed Farm');
    expect(getLocalWorkspaceDetail(adminWsId)?.name).toBe('Renamed Farm');

    localSetWorkspaceMemberRole(adminId, adminWsId, opId, 'operator');
    expect(getLocalWorkspaceDetail(adminWsId)?.members.find((m) => m.userId === opId)?.role).toBe('operator');

    localRemoveWorkspaceMember(adminId, adminWsId, opId);
    expect(getLocalWorkspaceDetail(adminWsId)?.members.some((m) => m.userId === opId)).toBe(false);
  });
});
