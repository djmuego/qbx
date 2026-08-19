import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../infrastructure/supabase/client';
import {
  isSupabaseConfigured,
  dataBackendMode,
  isAuthRequired,
  authBackendMode,
  isAuthConfigured,
} from '../infrastructure/supabase/config';
import type { AuthSessionContext, AuthUser, UserProfile, Workspace, WorkspaceMember, WorkspaceRole } from '../domain/auth/auth.types';
import {
  loadUserProfile,
  loadUserWorkspaces,
  updateProfileActiveWorkspace,
  createWorkspace as createWorkspaceRecord,
  deleteWorkspace as deleteWorkspaceRecord,
  updateWorkspaceName as updateWorkspaceNameRecord,
} from '../data/adapters/supabase/supabase-loader';
import { checkPlatformAdmin, checkUserDisabled, tryBootstrapPlatformAdmin } from '../data/adapters/supabase/admin-api';
import { deleteMyAccount as deleteMyAccountRemote, exportMyData as exportMyDataRemote } from '../data/adapters/supabase/privacy-api';
import {
  getLocalAccount,
  getLocalSession,
  isLocalPlatformAdmin,
  isLocalUserDisabled,
  localChangePassword,
  localCreateWorkspace,
  localDeleteWorkspace,
  localSetActiveWorkspace,
  localSignIn,
  localSignOut,
  localSignUp,
  localUpdateDisplayName,
  localUpdatePassword,
  localUpdateLocale,
  localUpdateWorkspaceName,
  ensureLocalAdminUser,
  deleteLocalAccount,
  exportLocalMyData,
} from '../infrastructure/auth/local-auth.store';

interface AuthContextValue {
  loading: boolean;
  user: AuthUser | null;
  session: Session | null;
  profile: UserProfile | null;
  workspaces: Workspace[];
  memberships: WorkspaceMember[];
  activeWorkspaceId: string | null;
  activeRole: WorkspaceRole | null;
  isPlatformAdmin: boolean;
  authContext: AuthSessionContext | null;
  authRequired: boolean;
  authConfigured: boolean;
  localAuthEnabled: boolean;
  supabaseEnabled: boolean;
  bootstrapping: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>;
  setActiveWorkspace: (workspaceId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateLocale: (locale: string) => Promise<void>;
  updateWorkspaceName: (name: string) => Promise<{ error?: string }>;
  createWorkspace: (name: string) => Promise<{ error?: string }>;
  deleteWorkspace: (workspaceId: string) => Promise<{ error?: string }>;
  exportMyData: () => Promise<{ data?: Record<string, unknown>; error?: string }>;
  deleteMyAccount: (confirmEmail: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function accountToState(account: NonNullable<ReturnType<typeof getLocalAccount>>) {
  return {
    profile: account.profile,
    workspaces: account.workspaces,
    memberships: account.memberships,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = getSupabaseClient();
  const authRequired = isAuthRequired();
  const backend = authBackendMode();
  const localAuthEnabled = backend === 'local';
  const authConfigured = isAuthConfigured();
  const supabaseEnabled = authConfigured && !localAuthEnabled && dataBackendMode() === 'supabase';
  const [loading, setLoading] = useState(authRequired && authConfigured);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [memberships, setMemberships] = useState<WorkspaceMember[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const applyLocalAccount = useCallback((userId: string) => {
    const account = getLocalAccount(userId);
    if (!account) {
      setProfile(null);
      setWorkspaces([]);
      setMemberships([]);
      return;
    }
    const state = accountToState(account);
    setProfile(state.profile);
    setWorkspaces(state.workspaces);
    setMemberships(state.memberships);
  }, []);

  const loadUserData = useCallback(
    async (authUser: AuthUser): Promise<{ blocked?: boolean }> => {
      if (localAuthEnabled) {
        if (isLocalUserDisabled(authUser.id)) {
          localSignOut();
          setUser(null);
          setProfile(null);
          setWorkspaces([]);
          setMemberships([]);
          setIsPlatformAdmin(false);
          return { blocked: true };
        }
        applyLocalAccount(authUser.id);
        setIsPlatformAdmin(isLocalPlatformAdmin(authUser.id));
        return {};
      }
      if (!supabase) return {};
      const disabled = await checkUserDisabled(supabase, authUser.id);
      if (disabled) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setWorkspaces([]);
        setMemberships([]);
        setIsPlatformAdmin(false);
        return { blocked: true };
      }
      let prof: UserProfile | null = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        prof = await loadUserProfile(supabase, authUser.id);
        if (prof) break;
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
      await tryBootstrapPlatformAdmin(supabase, authUser.email);
      const [{ workspaces: ws, memberships: mem }, platformAdmin] = await Promise.all([
        loadUserWorkspaces(supabase, authUser.id),
        checkPlatformAdmin(supabase),
      ]);
      if (prof) {
        setProfile(prof);
        setWorkspaces(ws);
        setMemberships(mem);
      }
      setIsPlatformAdmin(platformAdmin);
      return {};
    },
    [supabase, localAuthEnabled, applyLocalAccount],
  );

  useEffect(() => {
    if (!authRequired || !authConfigured) {
      setLoading(false);
      return;
    }

    if (localAuthEnabled) {
      let mounted = true;
      void (async () => {
        const seedEmail = import.meta.env.VITE_QBX_SEED_ADMIN_EMAIL as string | undefined;
        const seedPassword = import.meta.env.VITE_QBX_SEED_ADMIN_PASSWORD as string | undefined;
        const seedName = (import.meta.env.VITE_QBX_SEED_ADMIN_NAME as string | undefined) ?? 'Alex';
        await ensureLocalAdminUser(seedEmail ?? '', seedPassword ?? '', seedName);

        if (!mounted) return;
        const stored = getLocalSession();
        if (stored) {
          if (isLocalUserDisabled(stored.userId)) {
            localSignOut();
          } else {
            const authUser = { id: stored.userId, email: stored.email };
            setUser(authUser);
            applyLocalAccount(stored.userId);
            setIsPlatformAdmin(isLocalPlatformAdmin(stored.userId));
          }
        }
        setLoading(false);
      })();
      return () => {
        mounted = false;
      };
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      const authUser = data.session?.user;
      setUser(authUser ? { id: authUser.id, email: authUser.email } : null);
      if (authUser) {
        loadUserData(authUser).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      const authUser = nextSession?.user;
      setUser(authUser ? { id: authUser.id, email: authUser.email } : null);
      if (authUser) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          void loadUserData(authUser);
        }
      } else {
        setProfile(null);
        setWorkspaces([]);
        setMemberships([]);
        setIsPlatformAdmin(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, authRequired, authConfigured, localAuthEnabled, loadUserData, applyLocalAccount]);

  const activeWorkspaceId = profile?.activeWorkspaceId ?? workspaces[0]?.id ?? null;
  const activeRole = memberships.find((m) => m.workspaceId === activeWorkspaceId)?.role ?? null;

  const authContext = useMemo(() => {
    if (!user || !profile || !activeWorkspaceId || !activeRole) return null;
    return {
      userId: user.id,
      email: user.email ?? '',
      profile: { ...profile, activeWorkspaceId },
      workspaces,
      memberships,
      activeWorkspaceId,
      activeRole,
    } satisfies AuthSessionContext;
  }, [user, profile, workspaces, memberships, activeWorkspaceId, activeRole]);

  const bootstrapping = Boolean(user && authRequired && authConfigured && !profile);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (localAuthEnabled) {
        const res = await localSignIn(email, password);
        if (res.error) {
          return {
            error:
              res.error === 'Account disabled'
                ? 'Аккаунт заблокирован администратором'
                : res.error,
          };
        }
        if (res.user) {
          setUser(res.user);
          applyLocalAccount(res.user.id);
          setIsPlatformAdmin(isLocalPlatformAdmin(res.user.id));
        }
        return {};
      }
      if (!supabase) return { error: 'Supabase не настроен' };
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      return error ? { error: error.message } : {};
    },
    [supabase, localAuthEnabled, applyLocalAccount],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      if (localAuthEnabled) {
        const res = await localSignUp(email, password, displayName ?? email.split('@')[0]);
        if (res.error) return { error: res.error };
        if (res.user) {
          setUser(res.user);
          applyLocalAccount(res.user.id);
          setIsPlatformAdmin(isLocalPlatformAdmin(res.user.id));
        }
        return {};
      }
      if (!supabase) return { error: 'Supabase не настроен' };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { display_name: displayName ?? email.split('@')[0] },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) return { error: error.message };
      if (!data.session) {
        return { needsEmailConfirmation: true };
      }
      if (data.user) await loadUserData({ id: data.user.id, email: data.user.email });
      return {};
    },
    [supabase, localAuthEnabled, applyLocalAccount, loadUserData],
  );

  const signOut = useCallback(async () => {
    if (localAuthEnabled) {
      localSignOut();
    } else if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setWorkspaces([]);
    setMemberships([]);
  }, [supabase, localAuthEnabled]);

  const resetPassword = useCallback(
    async (email: string) => {
      if (localAuthEnabled) {
        return {
          error:
            'В локальном режиме сброс по email недоступен. Войдите с паролем или зарегистрируйте новый аккаунт.',
        };
      }
      if (!supabase) return { error: 'Supabase не настроен' };
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return error ? { error: error.message } : {};
    },
    [supabase, localAuthEnabled],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      if (localAuthEnabled) {
        if (!user) return { error: 'Не авторизован' };
        return localUpdatePassword(user.id, password);
      }
      if (!supabase) return { error: 'Supabase не настроен' };
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { error: error.message } : {};
    },
    [supabase, localAuthEnabled, user],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user?.email) return { error: 'Не авторизован' };
      if (localAuthEnabled) {
        return localChangePassword(user.id, user.email, currentPassword, newPassword);
      }
      if (!supabase) return { error: 'Supabase не настроен' };
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) return { error: verifyError.message };
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return error ? { error: error.message } : {};
    },
    [supabase, localAuthEnabled, user],
  );

  const setActiveWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return;
      if (localAuthEnabled) {
        const next = localSetActiveWorkspace(user.id, workspaceId);
        if (next) {
          const state = accountToState(next);
          setProfile(state.profile);
          setWorkspaces(state.workspaces);
          setMemberships(state.memberships);
        }
        return;
      }
      if (!supabase) return;
      await updateProfileActiveWorkspace(supabase, user.id, workspaceId);
      setProfile((p) => (p ? { ...p, activeWorkspaceId: workspaceId } : p));
    },
    [supabase, user, localAuthEnabled],
  );

  const refreshProfile = useCallback(async () => {
    if (user) await loadUserData(user);
  }, [user, loadUserData]);

  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!user) return;
      if (localAuthEnabled) {
        const next = localUpdateDisplayName(user.id, name);
        if (next) {
          const state = accountToState(next);
          setProfile(state.profile);
          setWorkspaces(state.workspaces);
          setMemberships(state.memberships);
        }
        return;
      }
      if (!supabase) return;
      await supabase.from('profiles').update({ display_name: name }).eq('id', user.id);
      setProfile((p) => (p ? { ...p, displayName: name } : p));
    },
    [supabase, user, localAuthEnabled],
  );

  const updateLocale = useCallback(
    async (locale: string) => {
      if (!user) return;
      if (localAuthEnabled) {
        const next = localUpdateLocale(user.id, locale);
        if (next) {
          const state = accountToState(next);
          setProfile(state.profile);
          setWorkspaces(state.workspaces);
          setMemberships(state.memberships);
        }
        return;
      }
      if (!supabase) return;
      await supabase.from('profiles').update({ locale }).eq('id', user.id);
      setProfile((p) => (p ? { ...p, locale } : p));
    },
    [supabase, user, localAuthEnabled],
  );

  const updateWorkspaceName = useCallback(
    async (name: string) => {
      if (!user || !activeWorkspaceId) return { error: 'Не выбран workspace' };
      if (localAuthEnabled) {
        const next = localUpdateWorkspaceName(user.id, activeWorkspaceId, name);
        if (!next) return { error: 'Не удалось сохранить' };
        const state = accountToState(next);
        setProfile(state.profile);
        setWorkspaces(state.workspaces);
        setMemberships(state.memberships);
        return {};
      }
      if (!supabase) return { error: 'Supabase не настроен' };
      try {
        await updateWorkspaceNameRecord(supabase, activeWorkspaceId, name.trim());
        setWorkspaces((ws) =>
          ws.map((w) => (w.id === activeWorkspaceId ? { ...w, name: name.trim() } : w)),
        );
        return {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Ошибка сохранения' };
      }
    },
    [supabase, user, localAuthEnabled, activeWorkspaceId],
  );

  const createWorkspace = useCallback(
    async (name: string) => {
      if (!user) return { error: 'Не авторизован' };
      if (localAuthEnabled) {
        const next = localCreateWorkspace(user.id, name);
        if (!next) return { error: 'Не удалось создать workspace' };
        const state = accountToState(next);
        setProfile(state.profile);
        setWorkspaces(state.workspaces);
        setMemberships(state.memberships);
        return {};
      }
      if (!supabase) return { error: 'Supabase не настроен' };
      try {
        const ws = await createWorkspaceRecord(supabase, user.id, name);
        await updateProfileActiveWorkspace(supabase, user.id, ws.id);
        await loadUserData(user);
        return {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Не удалось создать workspace' };
      }
    },
    [supabase, user, localAuthEnabled, loadUserData],
  );

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!user) return { error: 'Не авторизован' };
      if (localAuthEnabled) {
        const next = localDeleteWorkspace(user.id, workspaceId);
        if (!next) return { error: 'Нельзя удалить последний workspace' };
        const state = accountToState(next);
        setProfile(state.profile);
        setWorkspaces(state.workspaces);
        setMemberships(state.memberships);
        return {};
      }
      if (!supabase) return { error: 'Supabase не настроен' };
      try {
        await deleteWorkspaceRecord(supabase, workspaceId);
        await loadUserData(user);
        return {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Не удалось удалить workspace' };
      }
    },
    [supabase, user, localAuthEnabled, loadUserData],
  );

  const exportMyData = useCallback(async () => {
    if (!user) return { error: 'Не авторизован' };
    try {
      if (localAuthEnabled) {
        return { data: exportLocalMyData(user.id) };
      }
      if (!supabase) return { error: 'Supabase не настроен' };
      const data = await exportMyDataRemote(supabase);
      return { data: data as unknown as Record<string, unknown> };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Не удалось экспортировать данные' };
    }
  }, [supabase, user, localAuthEnabled]);

  const deleteMyAccount = useCallback(
    async (confirmEmail: string) => {
      if (!user) return { error: 'Не авторизован' };
      try {
        if (localAuthEnabled) {
          const result = deleteLocalAccount(user.id, confirmEmail);
          if (result.error) return result;
          setUser(null);
          setProfile(null);
          setWorkspaces([]);
          setMemberships([]);
          setIsPlatformAdmin(false);
          return {};
        }
        if (!supabase) return { error: 'Supabase не настроен' };
        await deleteMyAccountRemote(supabase, confirmEmail);
        await signOut();
        return {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Не удалось удалить аккаунт' };
      }
    },
    [supabase, user, localAuthEnabled, signOut],
  );

  const value: AuthContextValue = {
    loading,
    user,
    session,
    profile,
    workspaces,
    memberships,
    activeWorkspaceId,
    activeRole,
    isPlatformAdmin,
    authContext,
    authRequired,
    authConfigured,
    localAuthEnabled,
    supabaseEnabled,
    bootstrapping,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    changePassword,
    setActiveWorkspace,
    refreshProfile,
    updateDisplayName,
    updateLocale,
    updateWorkspaceName,
    createWorkspace,
    deleteWorkspace,
    exportMyData,
    deleteMyAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
