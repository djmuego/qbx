import React from 'react';
import { Plus, Trash2 } from '../../common/Icons';
import { useLocale } from '../../../i18n/LocaleContext';
import { AccountCard } from '../AccountShell';
import type { AccountActions } from '../useAccountActions';

export const AccountWorkspaceSection: React.FC<{ actions: AccountActions }> = ({ actions }) => {
  const { t, tv } = useLocale();
  const {
    workspaces,
    activeWorkspaceId,
    workspaceName,
    setWorkspaceName,
    newWorkspaceName,
    setNewWorkspaceName,
    showCreateWs,
    setShowCreateWs,
    confirmDeleteWs,
    setConfirmDeleteWs,
    activeWs,
    busy,
    canManageWs,
    saveWorkspace,
    handleCreateWorkspace,
    handleDeleteWorkspace,
    setActiveWorkspace,
    onDataReload,
  } = actions;

  return (
    <AccountCard title={t('account.workspace', 'Ферма')} description={t('account.workspaceHint', '')}>
      {canManageWs && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowCreateWs(!showCreateWs)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('account.createWorkspace', 'Создать')}
          </button>
        </div>
      )}

      {showCreateWs && (
        <div className="flex gap-2">
          <input
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder={t('account.workspaceName', 'Название')}
            className="flex-1 px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCreateWorkspace()}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            {t('settings.create', 'Создать')}
          </button>
        </div>
      )}

      {workspaces.length > 0 && (
        <label className="block text-xs text-slate-500">
          {t('account.switchWorkspace', 'Активная ферма')}
          <select
            value={activeWorkspaceId ?? ''}
            onChange={(e) => void setActiveWorkspace(e.target.value).then(() => onDataReload?.())}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm dark:bg-zinc-800"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {canManageWs && activeWorkspaceId && (
        <>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {t('account.workspaceName', 'Название фермы')}
            <input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm dark:bg-zinc-800"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveWorkspace()}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold"
          >
            {t('account.saveWorkspace', 'Сохранить')}
          </button>
        </>
      )}

      {canManageWs && workspaces.length > 0 && activeWs && (
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
          {!confirmDeleteWs ? (
            <button
              type="button"
              onClick={() => setConfirmDeleteWs(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('account.deleteWorkspace', 'Удалить ферму')}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-rose-600">
                {tv('account.deleteWorkspaceConfirm', { name: activeWs.name }, '')}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDeleteWs(false)} className="px-3 py-1.5 rounded-lg text-xs border">
                  {t('common.cancel', 'Отмена')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDeleteWorkspace()}
                  className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 text-white font-semibold disabled:opacity-50"
                >
                  {t('settings.delete', 'Удалить')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AccountCard>
  );
};
