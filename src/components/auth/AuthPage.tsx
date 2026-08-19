import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { mapAuthError } from '../../application/auth/auth-errors';
import { AuthLayout } from './AuthLayout';

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const { t } = useLocale();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingEmailConfirm, setAwaitingEmailConfirm] = useState(false);

  useEffect(() => {
    setError(null);
    setMessage(null);
    setAwaitingEmailConfirm(false);
  }, [mode]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setAwaitingEmailConfirm(false);

    const trimmedEmail = email.trim().toLowerCase();

    if (mode === 'register') {
      if (password.length < 6) {
        setError(t('auth.errors.passwordTooShort', 'Минимум 6 символов'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('auth.passwordMismatch', 'Пароли не совпадают'));
        return;
      }
      if (!displayName.trim()) {
        setError(t('auth.errors.nameRequired', 'Укажите имя'));
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await signIn(trimmedEmail, password);
        if (res.error) {
          const mapped = mapAuthError(res.error);
          setError(t(mapped.key, mapped.fallback));
        }
      } else if (mode === 'register') {
        const res = await signUp(trimmedEmail, password, displayName.trim());
        if (res.error) {
          const mapped = mapAuthError(res.error);
          setError(t(mapped.key, mapped.fallback));
        } else if (res.needsEmailConfirmation) {
          setAwaitingEmailConfirm(true);
          setMessage(t('auth.checkEmail', 'Проверьте почту'));
        } else {
          setMessage(t('auth.registerSuccess', 'Аккаунт создан. Входим…'));
        }
      } else {
        const res = await resetPassword(trimmedEmail);
        if (res.error) {
          const mapped = mapAuthError(res.error);
          setError(t(mapped.key, mapped.fallback));
        } else {
          setMessage(t('auth.resetSent', 'Ссылка отправлена'));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: AuthMode; label: string }[] = [
    { id: 'login', label: t('auth.login', 'Войти') },
    { id: 'register', label: t('auth.register', 'Регистрация') },
  ];

  if (awaitingEmailConfirm) {
    return (
      <AuthLayout title={t('auth.confirmEmailTitle', 'Подтвердите email')} subtitle={t('auth.checkEmail', '')}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-2xl">
            ✉️
          </div>
          <p className="text-sm text-slate-600 dark:text-zinc-300">
            {t('auth.confirmEmailHint', 'Мы отправили письмо на')} <strong>{email}</strong>
          </p>
          <p className="text-xs text-slate-500">{t('auth.confirmEmailAfter', 'После подтверждения войдите с паролем.')}</p>
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
          >
            {t('auth.login', 'Войти')}
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={mode === 'forgot' ? t('auth.forgotTitle', 'Сброс пароля') : t('auth.welcome', 'Добро пожаловать')}
      subtitle={
        mode === 'login'
          ? t('auth.loginSubtitle', 'Войдите в личный кабинет')
          : mode === 'register'
            ? t('auth.registerSubtitle', 'Создайте аккаунт QBX')
            : t('auth.forgotSubtitle', 'Ссылка придёт на email')
      }
    >
      {mode !== 'forgot' && (
        <div className="flex mb-6 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchMode(tab.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                mode === tab.id
                  ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {t('auth.name', 'Имя')}
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              placeholder={t('auth.namePlaceholder', 'Как к вам обращаться')}
            />
          </label>
        )}

        <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
          {t('auth.email', 'Email')}
          <input
            type="email"
            required
            autoComplete={mode === 'login' ? 'email' : 'username'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            placeholder="you@example.com"
          />
        </label>

        {mode !== 'forgot' && (
          <>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
              {t('auth.password', 'Пароль')}
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder="••••••••"
              />
            </label>
            {mode === 'register' && (
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                {t('auth.confirmPassword', 'Подтвердите пароль')}
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="••••••••"
                />
              </label>
            )}
            {mode === 'register' && (
              <p className="text-[11px] text-slate-400">{t('auth.passwordHint', 'Минимум 6 символов')}</p>
            )}
          </>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
        >
          {busy
            ? t('common.loading', 'Загрузка…')
            : mode === 'login'
              ? t('auth.login', 'Войти')
              : mode === 'register'
                ? t('auth.createAccount', 'Создать аккаунт')
                : t('auth.reset', 'Отправить ссылку')}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
        {mode === 'forgot' ? (
          <button type="button" onClick={() => switchMode('login')} className="text-emerald-700 dark:text-emerald-400 font-semibold">
            ← {t('auth.backToLogin', 'Назад ко входу')}
          </button>
        ) : (
          <button type="button" onClick={() => switchMode('forgot')} className="text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300">
            {t('auth.forgot', 'Забыли пароль?')}
          </button>
        )}
      </div>
    </AuthLayout>
  );
};
