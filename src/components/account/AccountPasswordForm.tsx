import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { mapAuthError } from '../../application/auth/auth-errors';

export const AccountPasswordForm: React.FC = () => {
  const { changePassword } = useAuth();
  const { t } = useLocale();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 6) {
      setError(t('auth.errors.passwordTooShort', 'Минимум 6 символов'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch', 'Пароли не совпадают'));
      return;
    }

    setBusy(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.error) {
        const mapped = mapAuthError(res.error);
        setError(t(mapped.key, mapped.fallback));
        return;
      }
      setMessage(t('account.passwordChanged', 'Пароль обновлён'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {t('account.changePassword', 'Смена пароля')}
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
          {t('account.currentPassword', 'Текущий пароль')}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
          {t('auth.newPassword', 'Новый пароль')}
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
          {t('auth.confirmPassword', 'Подтвердите пароль')}
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
          />
        </label>
        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}
        {message && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-60"
        >
          {busy ? t('common.loading', '…') : t('account.updatePassword', 'Обновить пароль')}
        </button>
      </form>
    </section>
  );
};
