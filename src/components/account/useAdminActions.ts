import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import {
  adminDeleteUser,
  adminDeleteWorkspace,
  banUser,
  exportAdminUserData,
  exportAuditLog,
  fetchAdminSubscriptions,
  fetchAdminUserDetail,
  fetchAdminUsers,
  fetchAdminWorkspaces,
  fetchAuditLog,
  fetchPlatformAdminStats,
  fetchPlatformAdmins,
  fetchWorkspaceDetail,
  fetchWorkspaceIntegrationsAdmin,
  fetchWorkspacePayload,
  fetchWorkspaceSubscriptionAdmin,
  setAdminSubscription,
  setHubLifetime,
  setPlatformAdminGrant,
  setUserDisabled,
  transferWorkspaceOwner,
  fetchPlatformConsciousnessAdmin,
  fetchWorkspaceAiConfigAdmin,
  setPlatformConsciousnessAdmin,
  setWorkspaceAiConfigAdmin,
  renameWorkspaceAdmin,
  setWorkspaceMemberRoleAdmin,
  removeWorkspaceMemberAdmin,
} from '../../data/adapters/supabase/admin-api';
import { downloadJson } from '../../data/adapters/supabase/privacy-api';
import {
  exportLocalUserDataForAdmin,
  getLocalUserDetail,
  getLocalWorkspaceDetail,
  getLocalWorkspaceIntegrations,
  getLocalWorkspacePayload,
  listLocalAuditLog,
  listLocalPlatformAdmins,
  listLocalSubscriptionsForAdmin,
  listLocalUsersForAdmin,
  listLocalWorkspacesForAdmin,
  localAdminDeleteUser,
  localAdminDeleteWorkspace,
  localPlatformAdminStats,
  localTransferWorkspaceOwner,
  localRenameWorkspace,
  localSetWorkspaceMemberRole,
  localRemoveWorkspaceMember,
  setLocalPlatformAdmin,
  setLocalUserAuthBan,
  setLocalUserDisabled,
} from '../../infrastructure/auth/local-auth.store';
import {
  getLocalWorkspaceSubscription,
  setLocalAdminSubscription,
  setLocalHubLifetime,
} from '../../infrastructure/auth/local-subscription.store';
import type {
  AdminPanelTab,
  PlatformAdminGrantRow,
  PlatformAdminStats,
  PlatformAdminSubscriptionRow,
  PlatformAdminUserDetail,
  PlatformAdminUserRow,
  PlatformAdminWorkspaceDetail,
  PlatformAdminWorkspaceIntegrations,
  PlatformAdminWorkspacePayload,
  PlatformAdminWorkspaceRow,
  PlatformAdminWorkspaceSubscription,
  PlatformAuditLogRow,
} from '../../domain/admin/platform-admin.types';
import {
  getLocalWorkspaceAiConfig,
  getLocalPlatformConsciousness,
  setLocalPlatformConsciousness,
  setLocalWorkspaceAiConfig,
} from '../../application/ai/ai-config.persistence';
import {
  parseWorkspaceAiConfig,
  serializePlatformConsciousness,
  serializeWorkspaceAiConfig,
} from '../../application/ai/ai-config.resolver';
import type { PlatformConsciousnessConfig, WorkspaceAiAdminConfig } from '../../domain/ai/ai-admin-config.types';
import type { SubscriptionStatus, SubscriptionTier } from '../../domain/commercial/subscription.types';
import { DEFAULT_WORKSPACE_AI_ADMIN_CONFIG } from '../../domain/ai/ai-admin-config.types';

export function useAdminActions() {
  const { user, localAuthEnabled, supabaseEnabled, isPlatformAdmin } = useAuth();
  const supabase = getSupabaseClient();

  const [tab, setTab] = useState<AdminPanelTab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<PlatformAdminStats | null>(null);
  const [users, setUsers] = useState<PlatformAdminUserRow[]>([]);
  const [workspaces, setWorkspaces] = useState<PlatformAdminWorkspaceRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlatformAdminSubscriptionRow[]>([]);
  const [platformAdmins, setPlatformAdmins] = useState<PlatformAdminGrantRow[]>([]);
  const [auditLog, setAuditLog] = useState<PlatformAuditLogRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'disabled' | 'banned' | 'admin'>('all');
  const [userPage, setUserPage] = useState(0);
  const USERS_PAGE_SIZE = 25;
  const [userDetail, setUserDetail] = useState<PlatformAdminUserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDeleteBusy, setUserDeleteBusy] = useState(false);
  const [workspaceDetail, setWorkspaceDetail] = useState<PlatformAdminWorkspaceDetail | null>(null);
  const [workspaceDetailLoading, setWorkspaceDetailLoading] = useState(false);
  const [workspacePayload, setWorkspacePayload] = useState<PlatformAdminWorkspacePayload | Record<string, unknown> | null>(null);
  const [workspacePayloadLoading, setWorkspacePayloadLoading] = useState(false);
  const [workspaceDeleteBusy, setWorkspaceDeleteBusy] = useState(false);
  const [workspaceSubscription, setWorkspaceSubscription] = useState<PlatformAdminWorkspaceSubscription | null>(null);
  const [workspaceIntegrations, setWorkspaceIntegrations] = useState<PlatformAdminWorkspaceIntegrations | null>(null);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [hubLifetimeBusy, setHubLifetimeBusy] = useState(false);
  const [transferOwnerId, setTransferOwnerId] = useState('');
  const [platformConsciousnessRaw, setPlatformConsciousnessRaw] = useState<Record<string, unknown> | null>(null);
  const [consciousnessLoading, setConsciousnessLoading] = useState(false);
  const [consciousnessSaveBusy, setConsciousnessSaveBusy] = useState(false);
  const [workspaceAiConfig, setWorkspaceAiConfig] = useState<WorkspaceAiAdminConfig>(DEFAULT_WORKSPACE_AI_ADMIN_CONFIG);
  const [workspaceAiSaveBusy, setWorkspaceAiSaveBusy] = useState(false);

  const loadAll = useCallback(async () => {
    if (!isPlatformAdmin || !user) return;
    setLoading(true);
    setError(null);
    try {
      if (localAuthEnabled) {
        setStats(localPlatformAdminStats());
        setUsers(listLocalUsersForAdmin());
        setWorkspaces(listLocalWorkspacesForAdmin());
        setSubscriptions(listLocalSubscriptionsForAdmin());
        setPlatformAdmins(listLocalPlatformAdmins());
        setAuditLog(listLocalAuditLog());
      } else if (supabase) {
        const [nextStats, nextUsers, nextWorkspaces, nextSubs, nextAdmins, nextAudit] = await Promise.all([
          fetchPlatformAdminStats(supabase),
          fetchAdminUsers(supabase),
          fetchAdminWorkspaces(supabase),
          fetchAdminSubscriptions(supabase),
          fetchPlatformAdmins(supabase),
          fetchAuditLog(supabase),
        ]);
        setStats(nextStats);
        setUsers(nextUsers);
        setWorkspaces(nextWorkspaces);
        setSubscriptions(nextSubs);
        setPlatformAdmins(nextAdmins);
        setAuditLog(nextAudit);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin, user, localAuthEnabled, supabase]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshUserDetail = async (userId: string) => {
    if (localAuthEnabled) {
      setUserDetail(getLocalUserDetail(userId));
    } else if (supabase) {
      setUserDetail(await fetchAdminUserDetail(supabase, userId));
    }
  };

  const grantPlatformAdmin = async (targetUserId: string) => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        setLocalPlatformAdmin(user.id, targetUserId, true);
      } else if (supabase) {
        await setPlatformAdminGrant(supabase, targetUserId, true);
      }
      setSuccess('Права платформенного админа выданы');
      await loadAll();
      if (userDetail?.id === targetUserId) await refreshUserDetail(targetUserId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выдать права');
    }
  };

  const revokePlatformAdmin = async (targetUserId: string) => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        setLocalPlatformAdmin(user.id, targetUserId, false);
      } else if (supabase) {
        await setPlatformAdminGrant(supabase, targetUserId, false);
      }
      setSuccess('Права платформенного админа сняты');
      await loadAll();
      if (userDetail?.id === targetUserId) await refreshUserDetail(targetUserId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось снять права');
    }
  };

  const toggleUserSoftDisable = async (targetUserId: string, disabled: boolean) => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        setLocalUserDisabled(user.id, targetUserId, disabled);
      } else if (supabase) {
        await setUserDisabled(supabase, targetUserId, disabled);
      }
      setSuccess(disabled ? 'Профиль заблокирован (мягкая блокировка)' : 'Мягкая блокировка снята');
      await loadAll();
      if (userDetail?.id === targetUserId) await refreshUserDetail(targetUserId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить статус');
    }
  };

  const toggleUserBan = async (targetUserId: string, ban: boolean) => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        setLocalUserAuthBan(user.id, targetUserId, ban);
      } else if (supabase) {
        await banUser(supabase, targetUserId, ban);
      }
      setSuccess(ban ? 'Пользователь забанен (Auth + профиль)' : 'Бан снят');
      await loadAll();
      if (userDetail?.id === targetUserId) await refreshUserDetail(targetUserId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить статус');
    }
  };

  const openUserDetail = async (userId: string) => {
    setUserDetailLoading(true);
    setError(null);
    try {
      await refreshUserDetail(userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить пользователя');
      setUserDetail(null);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const closeUserDetail = () => setUserDetail(null);

  const exportUserData = async (userId: string) => {
    setError(null);
    try {
      let data: Record<string, unknown>;
      if (localAuthEnabled) {
        data = exportLocalUserDataForAdmin(userId);
      } else if (supabase) {
        data = await exportAdminUserData(supabase, userId);
      } else {
        return;
      }
      const email = (data.profile as { email?: string } | undefined)?.email ?? userId;
      downloadJson(`qbx-user-export-${email.replace(/[@.]/g, '_')}.json`, data);
      setSuccess('Данные пользователя экспортированы');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось экспортировать данные');
    }
  };

  const deleteUserAdmin = async (userId: string) => {
    if (!user) return;
    setUserDeleteBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        localAdminDeleteUser(user.id, userId);
      } else if (supabase) {
        await adminDeleteUser(supabase, userId);
      }
      setSuccess('Пользователь удалён');
      closeUserDetail();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить пользователя');
    } finally {
      setUserDeleteBusy(false);
    }
  };

  const openWorkspaceDetail = async (workspaceId: string) => {
    setWorkspaceDetailLoading(true);
    setWorkspacePayload(null);
    setWorkspaceIntegrations(null);
    setTransferOwnerId('');
    setError(null);
    try {
      if (localAuthEnabled) {
        setWorkspaceDetail(getLocalWorkspaceDetail(workspaceId));
        const sub = getLocalWorkspaceSubscription(workspaceId);
        setWorkspaceSubscription({
          hubLifetime: sub.hubLifetime,
          tier: sub.tier,
          status: sub.status,
          trialEndsAt: sub.trialEndsAt,
          stripeCustomerId: sub.stripeCustomerId,
        });
        setWorkspaceIntegrations(getLocalWorkspaceIntegrations(workspaceId));
        setWorkspaceAiConfig(getLocalWorkspaceAiConfig(workspaceId) ?? DEFAULT_WORKSPACE_AI_ADMIN_CONFIG);
      } else if (supabase) {
        const [detail, sub, integrations] = await Promise.all([
          fetchWorkspaceDetail(supabase, workspaceId),
          fetchWorkspaceSubscriptionAdmin(supabase, workspaceId),
          fetchWorkspaceIntegrationsAdmin(supabase, workspaceId),
        ]);
        setWorkspaceDetail(detail);
        setWorkspaceSubscription(sub);
        setWorkspaceIntegrations(integrations);
        const aiRaw = await fetchWorkspaceAiConfigAdmin(supabase, workspaceId);
        setWorkspaceAiConfig(parseWorkspaceAiConfig(aiRaw) ?? DEFAULT_WORKSPACE_AI_ADMIN_CONFIG);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить ферму');
      setWorkspaceDetail(null);
    } finally {
      setWorkspaceDetailLoading(false);
    }
  };

  const loadWorkspacePayload = async (workspaceId: string) => {
    setWorkspacePayloadLoading(true);
    setError(null);
    try {
      if (localAuthEnabled) {
        setWorkspacePayload(getLocalWorkspacePayload(workspaceId));
      } else if (supabase) {
        setWorkspacePayload(await fetchWorkspacePayload(supabase, workspaceId));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить payload');
      setWorkspacePayload(null);
    } finally {
      setWorkspacePayloadLoading(false);
    }
  };

  const deleteWorkspaceAdmin = async (workspaceId: string) => {
    if (!user) return;
    setWorkspaceDeleteBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        localAdminDeleteWorkspace(user.id, workspaceId);
      } else if (supabase) {
        await adminDeleteWorkspace(supabase, workspaceId);
      }
      setSuccess('Ферма удалена');
      closeWorkspaceDetail();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить ферму');
    } finally {
      setWorkspaceDeleteBusy(false);
    }
  };

  const toggleHubLifetime = async (workspaceId: string, enabled: boolean) => {
    if (!user) return;
    setHubLifetimeBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        setLocalHubLifetime(workspaceId, enabled);
      } else if (supabase) {
        await setHubLifetime(supabase, workspaceId, enabled);
      }
      setWorkspaceSubscription((prev) => (prev ? { ...prev, hubLifetime: enabled } : prev));
      setSuccess(enabled ? 'Hub Lifetime Pro выдан' : 'Hub Lifetime снят');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить Hub Lifetime');
    } finally {
      setHubLifetimeBusy(false);
    }
  };

  const updateWorkspaceSubscription = async (
    workspaceId: string,
    opts: { tier?: SubscriptionTier; status?: SubscriptionStatus; extendTrialDays?: number; trialEndsAt?: string | null },
  ) => {
    setSubscriptionBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        setLocalAdminSubscription(workspaceId, opts);
        const sub = getLocalWorkspaceSubscription(workspaceId);
        setWorkspaceSubscription({
          hubLifetime: sub.hubLifetime,
          tier: sub.tier,
          status: sub.status,
          trialEndsAt: sub.trialEndsAt,
          stripeCustomerId: sub.stripeCustomerId,
        });
      } else if (supabase) {
        await setAdminSubscription(supabase, workspaceId, opts);
        const sub = await fetchWorkspaceSubscriptionAdmin(supabase, workspaceId);
        setWorkspaceSubscription(sub);
      }
      setSuccess('Подписка обновлена');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось обновить подписку');
    } finally {
      setSubscriptionBusy(false);
    }
  };

  const transferWorkspaceOwnerAdmin = async (workspaceId: string, newOwnerId: string) => {
    if (!user || !newOwnerId.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        localTransferWorkspaceOwner(user.id, workspaceId, newOwnerId.trim());
      } else if (supabase) {
        await transferWorkspaceOwner(supabase, workspaceId, newOwnerId.trim());
      }
      setSuccess('Владелец фермы изменён');
      await openWorkspaceDetail(workspaceId);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сменить владельца');
    }
  };

  const exportAuditLogFile = async () => {
    if (!user) return;
    setError(null);
    try {
      let rows: PlatformAuditLogRow[] | Record<string, unknown>[];
      if (localAuthEnabled) {
        rows = listLocalAuditLog();
      } else if (supabase) {
        rows = await exportAuditLog(supabase);
      } else {
        return;
      }
      downloadJson(`qbx-audit-log-${new Date().toISOString().slice(0, 10)}.json`, rows);
      setSuccess('Журнал экспортирован');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось экспортировать журнал');
    }
  };

  const loadPlatformConsciousness = useCallback(async () => {
    if (!isPlatformAdmin) return;
    setConsciousnessLoading(true);
    try {
      if (localAuthEnabled) {
        setPlatformConsciousnessRaw(serializePlatformConsciousness(getLocalPlatformConsciousness()));
      } else if (supabase) {
        setPlatformConsciousnessRaw(await fetchPlatformConsciousnessAdmin(supabase));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить сознание платформы');
    } finally {
      setConsciousnessLoading(false);
    }
  }, [isPlatformAdmin, localAuthEnabled, supabase]);

  const savePlatformConsciousness = async (config: PlatformConsciousnessConfig) => {
    if (!user) return;
    setConsciousnessSaveBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = serializePlatformConsciousness(config);
      if (localAuthEnabled) {
        setLocalPlatformConsciousness(config);
      } else if (supabase) {
        await setPlatformConsciousnessAdmin(supabase, payload);
      }
      setPlatformConsciousnessRaw(payload);
      setSuccess('Глобальное сознание сохранено');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setConsciousnessSaveBusy(false);
    }
  };

  const saveWorkspaceAiConfig = async (workspaceId: string) => {
    if (!user) return;
    setWorkspaceAiSaveBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = serializeWorkspaceAiConfig(workspaceAiConfig);
      if (localAuthEnabled) {
        setLocalWorkspaceAiConfig(workspaceId, workspaceAiConfig);
      } else if (supabase) {
        await setWorkspaceAiConfigAdmin(supabase, workspaceId, payload);
      }
      setSuccess('AI настройки фермы сохранены');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить AI настройки');
    } finally {
      setWorkspaceAiSaveBusy(false);
    }
  };

  const closeWorkspaceDetail = () => {
    setWorkspaceDetail(null);
    setWorkspacePayload(null);
    setWorkspaceSubscription(null);
    setWorkspaceIntegrations(null);
    setTransferOwnerId('');
    setWorkspaceAiConfig(DEFAULT_WORKSPACE_AI_ADMIN_CONFIG);
  };

  const platformAdminIds = new Set(platformAdmins.map((a) => a.userId));

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (
      q &&
      !(u.email ?? '').toLowerCase().includes(q) &&
      !u.displayName.toLowerCase().includes(q) &&
      !u.id.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (userStatusFilter === 'disabled' && !u.isDisabled) return false;
    if (userStatusFilter === 'banned' && !u.isAuthBanned) return false;
    if (userStatusFilter === 'active' && (u.isDisabled || u.isAuthBanned)) return false;
    if (userStatusFilter === 'admin' && !platformAdminIds.has(u.id)) return false;
    return true;
  });

  const pagedUsers = filteredUsers.slice(userPage * USERS_PAGE_SIZE, (userPage + 1) * USERS_PAGE_SIZE);
  const userPageCount = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));

  const renameWorkspaceAdminAction = async (workspaceId: string, name: string) => {
    if (!user || !name.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        localRenameWorkspace(user.id, workspaceId, name);
      } else if (supabase) {
        await renameWorkspaceAdmin(supabase, workspaceId, name);
      }
      setSuccess('Ферма переименована');
      await openWorkspaceDetail(workspaceId);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось переименовать');
    }
  };

  const setMemberRoleAdmin = async (workspaceId: string, targetUserId: string, role: string) => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        localSetWorkspaceMemberRole(user.id, workspaceId, targetUserId, role);
      } else if (supabase) {
        await setWorkspaceMemberRoleAdmin(supabase, workspaceId, targetUserId, role);
      }
      setSuccess('Роль участника обновлена');
      await openWorkspaceDetail(workspaceId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить роль');
    }
  };

  const removeMemberAdmin = async (workspaceId: string, targetUserId: string) => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    try {
      if (localAuthEnabled) {
        localRemoveWorkspaceMember(user.id, workspaceId, targetUserId);
      } else if (supabase) {
        await removeWorkspaceMemberAdmin(supabase, workspaceId, targetUserId);
      }
      setSuccess('Участник удалён из фермы');
      await openWorkspaceDetail(workspaceId);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить участника');
    }
  };

  return {
    tab,
    setTab,
    loading,
    error,
    success,
    stats,
    users: pagedUsers,
    allFilteredUsers: filteredUsers,
    workspaces,
    subscriptions,
    platformAdmins,
    platformAdminIds,
    auditLog,
    userSearch,
    setUserSearch,
    userStatusFilter,
    setUserStatusFilter,
    userPage,
    setUserPage,
    userPageCount,
    pagedUsers,
    filteredUsersCount: filteredUsers.length,
    grantPlatformAdmin,
    revokePlatformAdmin,
    toggleUserSoftDisable,
    toggleUserBan,
    userDetail,
    userDetailLoading,
    userDeleteBusy,
    openUserDetail,
    closeUserDetail,
    exportUserData,
    deleteUserAdmin,
    workspaceDetail,
    workspaceDetailLoading,
    workspacePayload,
    workspacePayloadLoading,
    workspaceDeleteBusy,
    workspaceSubscription,
    workspaceIntegrations,
    subscriptionBusy,
    hubLifetimeBusy,
    transferOwnerId,
    setTransferOwnerId,
    openWorkspaceDetail,
    closeWorkspaceDetail,
    loadWorkspacePayload,
    deleteWorkspaceAdmin,
    toggleHubLifetime,
    updateWorkspaceSubscription,
    transferWorkspaceOwnerAdmin,
    renameWorkspaceAdminAction,
    setMemberRoleAdmin,
    removeMemberAdmin,
    exportAuditLogFile,
    platformConsciousnessRaw,
    consciousnessLoading,
    consciousnessSaveBusy,
    loadPlatformConsciousness,
    savePlatformConsciousness,
    workspaceAiConfig,
    setWorkspaceAiConfig,
    workspaceAiSaveBusy,
    saveWorkspaceAiConfig,
    reload: loadAll,
    cloudReady: supabaseEnabled,
    localMode: localAuthEnabled,
  };
}
