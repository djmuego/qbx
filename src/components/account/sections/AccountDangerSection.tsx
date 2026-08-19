import React, { useState } from 'react';
import { LogOut, Download, Trash2 } from '../../common/Icons';
import { useLocale } from '../../../i18n/LocaleContext';
import { useAuth } from '../../../context/AuthContext';
import { downloadJson } from '../../../data/adapters/supabase/privacy-api';
import { AccountCard } from '../AccountShell';
import type { AccountActions } from '../useAccountActions';

export const AccountDangerSection: React.FC<{ actions: AccountActions }> = ({ actions }) => {
  const { t } = useLocale();
  const { user, exportMyData, deleteMyAccount } = useAuth();
  const { signOut: signOutFromActions } = actions;

  const [confirmEmail, setConfirmEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExportPersonalData = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await exportMyData();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        downloadJson(`qbx-personal-data-${new Date().toISOString().slice(0, 10)}.json`, result.data);
        setSuccess(t('account.danger.exportDone', 'Персональные данные экспортированы'));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await deleteMyAccount(confirmEmail);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowDeleteConfirm(false);
      setConfirmEmail('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <AccountCard
        title={t('account.danger.privacyTitle', 'Персональные данные')}
        description={t(
          'account.danger.privacyHint',
          'Вы можете экспортировать профиль и членства. Полный бэкап фермы — в разделе «Данные».',
        )}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleExportPersonalData()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-sm font-semibold disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {t('account.danger.exportPersonal', 'Экспорт персональных данных')}
        </button>
        {success && <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">{success}</p>}
      </AccountCard>

      <AccountCard
        title={t('account.danger.deleteTitle', 'Удаление аккаунта')}
        description={t(
          'account.danger.deleteHint',
          'Безвозвратно удаляет профиль, членства и все фермы, где вы владелец. Это право предусмотрено при сборе персональных данных.',
        )}
      >
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-sm font-semibold text-rose-600"
          >
            <Trash2 className="w-4 h-4" />
            {t('account.danger.deleteAccount', 'Удалить аккаунт')}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {t(
                'account.danger.deleteWarning',
                'Введите email для подтверждения. Действие необратимо.',
              )}
            </p>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={user?.email ?? 'email'}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !confirmEmail.trim()}
                onClick={() => void handleDeleteAccount()}
                className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {busy ? t('common.loading', 'Загрузка…') : t('account.danger.confirmDelete', 'Удалить навсегда')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmEmail('');
                  setError(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold"
              >
                {t('common.cancel', 'Отмена')}
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      </AccountCard>

      <AccountCard title={t('account.danger.title', 'Выход')} description={t('account.danger.hint', '')}>
        <p className="text-xs text-slate-500">{t('account.danger.signOutNote', '')}</p>
        <button
          type="button"
          onClick={() => void signOutFromActions()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          {t('account.signOut', 'Выйти')}
        </button>
      </AccountCard>
    </div>
  );
};
