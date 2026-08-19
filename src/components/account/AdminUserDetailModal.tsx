import React, { useState } from 'react';
import { X, Download, Trash2, Ban, ShieldOff, ShieldCheck } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleContext';
import type { PlatformAdminUserDetail } from '../../domain/admin/platform-admin.types';

interface AdminUserDetailModalProps {
  detail: PlatformAdminUserDetail | null;
  loading: boolean;
  isSelf: boolean;
  deleteBusy: boolean;
  onClose: () => void;
  onExportData: (userId: string) => void;
  onSoftDisable: (userId: string, disabled: boolean) => void;
  onAuthBan: (userId: string, ban: boolean) => void;
  onGrantAdmin: (userId: string) => void;
  onRevokeAdmin: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
}

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleString();
}

export const AdminUserDetailModal: React.FC<AdminUserDetailModalProps> = ({
  detail,
  loading,
  isSelf,
  deleteBusy,
  onClose,
  onExportData,
  onSoftDisable,
  onAuthBan,
  onGrantAdmin,
  onRevokeAdmin,
  onDeleteUser,
}) => {
  const { t } = useLocale();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!detail && !loading) return null;

  const softDisabled = detail?.isDisabled && !detail?.isAuthBanned;
  const banned = detail?.isAuthBanned;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur">
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{detail?.displayName || detail?.email || '—'}</p>
            <p className="text-[11px] text-slate-500 truncate">{detail?.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && <p className="p-4 text-xs text-slate-500">{t('common.loading', 'Загрузка…')}</p>}

        {detail && !loading && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{t('account.admin.colCreated', 'Создан')}</p>
                <p className="font-semibold mt-1">{formatDate(detail.createdAt)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{t('account.admin.colStatus', 'Статус')}</p>
                <p className="font-semibold mt-1">
                  {banned
                    ? t('account.admin.statusBanned', 'Auth бан')
                    : softDisabled
                      ? t('account.admin.statusSoftDisabled', 'Мягкая блокировка')
                      : t('account.admin.statusActive', 'Активен')}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onExportData(detail.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                {t('account.admin.exportUserData', 'Экспорт данных')}
              </button>
              {!isSelf && !detail.isPlatformAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => onSoftDisable(detail.id, !detail.isDisabled)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-[11px] font-semibold"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    {detail.isDisabled
                      ? t('account.admin.enableUser', 'Разблокировать')
                      : t('account.admin.softDisable', 'Мягкая блокировка')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAuthBan(detail.id, !banned)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-[11px] font-semibold text-rose-600"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    {banned ? t('account.admin.unbanUser', 'Снять бан') : t('account.admin.banUser', 'Забанить (Auth)')}
                  </button>
                </>
              )}
              {!isSelf && (
                detail.isPlatformAdmin ? (
                  <button
                    type="button"
                    onClick={() => onRevokeAdmin(detail.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sky-200 text-[11px] font-semibold text-sky-700"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t('account.admin.revokeAdmin', 'Снять админа')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onGrantAdmin(detail.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-[11px] font-semibold text-emerald-700"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t('account.admin.grantAdmin', 'Сделать админом')}
                  </button>
                )
              )}
            </div>

            {detail.ownedWorkspaces.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {t('account.admin.ownedFarms', 'Владеет фермами')}
                </p>
                <ul className="space-y-1.5">
                  {detail.ownedWorkspaces.map((ws) => (
                    <li key={ws.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 text-xs font-semibold">
                      {ws.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('account.admin.memberships', 'Участие в фермах')}
              </p>
              {detail.memberships.length === 0 ? (
                <p className="text-xs text-slate-500">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.memberships.map((m) => (
                    <li
                      key={`${m.workspaceId}-${m.role}`}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 text-xs"
                    >
                      <span className="font-semibold truncate">{m.workspaceName}</span>
                      <span className="text-[10px] font-bold uppercase text-slate-500">{m.role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!isSelf && !detail.isPlatformAdmin && (
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('account.admin.deleteUser', 'Удалить пользователя')}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      {t('account.admin.deleteUserConfirm', 'Удалить аккаунт и все принадлежащие фермы безвозвратно?')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={deleteBusy}
                        onClick={() => onDeleteUser(detail.id)}
                        className="px-3 py-2 rounded-xl bg-rose-600 text-white text-[11px] font-semibold disabled:opacity-50"
                      >
                        {deleteBusy ? t('common.loading', 'Загрузка…') : t('common.delete', 'Удалить')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-[11px] font-semibold"
                      >
                        {t('common.cancel', 'Отмена')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
