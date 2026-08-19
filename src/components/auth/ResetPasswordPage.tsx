import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { AuthLayout } from './AuthLayout';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword } = useAuth();
  const { t } = useLocale();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password !== confirm) {
      setError(t('auth.passwordMismatch', 'Пароли не совпадают'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.errors.passwordTooShort', 'Минимум 6 символов'));
      return;
    }
    setBusy(true);
    try {
      const res = await updatePassword(password);
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(t('auth.passwordUpdated', 'Пароль обновлён'));
      window.history.replaceState({}, '', '/');
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t('auth.resetPageTitle', 'Новый пароль')} subtitle={t('auth.resetPageHint', '')}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
          {t('auth.newPassword', 'Новый пароль')}
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
          />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {message && <p className="text-xs text-emerald-600">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          {busy ? t('common.loading', '…') : t('auth.updatePassword', 'Сохранить')}
        </button>
      </form>
    </AuthLayout>
  );
};

export function isPasswordRecoveryRoute(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname === '/reset-password') return true;
  return window.location.hash.includes('type=recovery');
}
