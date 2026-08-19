import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { canManageMembers, canManageWorkspace } from '../../domain/auth/role-guards';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import {
  updateWorkspaceName as updateWorkspaceNameRemote,
  listWorkspaceMembers,
  upsertWorkspaceMember,
  removeWorkspaceMember,
  findUserIdByEmail,
  updateMemberRole,
} from '../../data/adapters/supabase/supabase-loader';
import { importLocalStorageToWorkspace, isLocalMigrated } from '../../application/migration/local-to-cloud.import';
import type { WorkspaceMember, WorkspaceRole } from '../../domain/auth/auth.types';
import type { LocalDemoDataLayerInstance } from '../../data/adapters/local-demo.repository';

interface UseAccountActionsOptions {
  dataLayer: LocalDemoDataLayerInstance | null;
  onDataReload?: () => void;
}

export function useAccountActions({ dataLayer, onDataReload }: UseAccountActionsOptions) {
  const {
    user,
    profile,
    workspaces,
    activeWorkspaceId,
    activeRole,
    memberships,
    signOut,
    updateDisplayName,
    updateLocale,
    updateWorkspaceName,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    refreshProfile,
    supabaseEnabled,
    localAuthEnabled,
  } = useAuth();
  const { t, tv } = useLocale();
  const supabase = getSupabaseClient();

  const [name, setName] = useState(profile?.displayName ?? '');
  const [workspaceName, setWorkspaceName] = useState(
    workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? '',
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<WorkspaceRole>('viewer');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [confirmDeleteWs, setConfirmDeleteWs] = useState(false);

  useEffect(() => {
    setName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  useEffect(() => {
    setWorkspaceName(workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? '');
  }, [activeWorkspaceId, workspaces]);

  const roleLabel = useCallback(
    (role: WorkspaceRole) => t(`account.roles.${role}`, role),
    [t],
  );

  const loadMembers = useCallback(async () => {
    if (localAuthEnabled) {
      setMembers(memberships.filter((m) => m.workspaceId === activeWorkspaceId));
      return;
    }
    if (!supabase || !activeWorkspaceId) return;
    const list = await listWorkspaceMembers(supabase, activeWorkspaceId);
    setMembers(list);
  }, [supabase, activeWorkspaceId, localAuthEnabled, memberships]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const saveProfile = async () => {
    clearMessages();
    await updateDisplayName(name.trim());
    setSuccessMsg(t('account.profileSaved', 'Профиль сохранён'));
  };

  const saveWorkspace = async () => {
    if (!canManageWorkspace(activeRole ?? 'viewer')) return;
    clearMessages();
    setBusy(true);
    const res = await updateWorkspaceName(workspaceName.trim());
    setBusy(false);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    if (supabaseEnabled && supabase) {
      await refreshProfile();
    }
    setSuccessMsg(t('account.workspaceSaved', 'Название фермы сохранено'));
  };

  const handleCreateWorkspace = async () => {
    setBusy(true);
    clearMessages();
    const res = await createWorkspace(newWorkspaceName.trim() || 'My Farm');
    setBusy(false);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    setNewWorkspaceName('');
    setShowCreateWs(false);
    onDataReload?.();
    setSuccessMsg(t('account.workspaceCreated', 'Ферма создана'));
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspaceId) return;
    setBusy(true);
    clearMessages();
    const res = await deleteWorkspace(activeWorkspaceId);
    setBusy(false);
    setConfirmDeleteWs(false);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    onDataReload?.();
  };

  const inviteMember = async () => {
    if (!supabase || !activeWorkspaceId || !memberEmail.trim()) return;
    clearMessages();
    setBusy(true);
    try {
      const userId = await findUserIdByEmail(supabase, memberEmail);
      if (!userId) {
        setErrorMsg(t('account.memberNotFound', 'Не найден'));
        return;
      }
      await upsertWorkspaceMember(supabase, activeWorkspaceId, userId, memberRole);
      setMemberEmail('');
      await loadMembers();
      setSuccessMsg(t('account.memberAdded', 'Участник добавлен'));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const changeMemberRole = async (userId: string, role: WorkspaceRole) => {
    if (!supabase || !activeWorkspaceId) return;
    await updateMemberRole(supabase, activeWorkspaceId, userId, role);
    await loadMembers();
  };

  const removeMember = async (userId: string) => {
    if (!supabase || !activeWorkspaceId || !user) return;
    if (userId === user.id) {
      setErrorMsg(t('account.cannotRemoveSelf', ''));
      return;
    }
    await removeWorkspaceMember(supabase, activeWorkspaceId, userId);
    await loadMembers();
  };

  const runImport = async () => {
    if (!supabase || !dataLayer || !user || !activeWorkspaceId) return;
    setBusy(true);
    clearMessages();
    try {
      const authCtx = {
        userId: user.id,
        email: user.email ?? '',
        profile: profile!,
        workspaces,
        memberships: [],
        activeWorkspaceId,
        activeRole: activeRole ?? 'owner',
      };
      const result = await importLocalStorageToWorkspace(supabase, authCtx, dataLayer);
      setImportMsg(
        tv('account.importResult', {
          spaces: result.spaces,
          devices: result.devices,
          maps: result.maps,
        }, ''),
      );
      onDataReload?.();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Ошибка импорта');
    } finally {
      setBusy(false);
    }
  };

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const canManageWs = canManageWorkspace(activeRole ?? 'viewer');
  const canManageTeam = canManageMembers(activeRole ?? 'viewer');
  const cloudReady = supabaseEnabled && Boolean(supabase);
  const imported = isLocalMigrated(user?.id ?? '');

  return {
    user,
    profile,
    workspaces,
    activeWorkspaceId,
    activeRole,
    activeWs,
    name,
    setName,
    workspaceName,
    setWorkspaceName,
    newWorkspaceName,
    setNewWorkspaceName,
    memberEmail,
    setMemberEmail,
    memberRole,
    setMemberRole,
    members,
    importMsg,
    errorMsg,
    successMsg,
    busy,
    showCreateWs,
    setShowCreateWs,
    confirmDeleteWs,
    setConfirmDeleteWs,
    roleLabel,
    saveProfile,
    saveWorkspace,
    handleCreateWorkspace,
    handleDeleteWorkspace,
    inviteMember,
    changeMemberRole,
    removeMember,
    runImport,
    setActiveWorkspace,
    signOut,
    updateLocale,
    onDataReload,
    canManageWs,
    canManageTeam,
    cloudReady,
    localAuthEnabled,
    imported,
    dataLayer,
  };
}

export type AccountActions = ReturnType<typeof useAccountActions>;
