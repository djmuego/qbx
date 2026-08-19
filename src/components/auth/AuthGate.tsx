import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthPage } from './AuthPage';
import { AuthSetupPage } from './AuthSetupPage';
import { ResetPasswordPage, isPasswordRecoveryRoute } from './ResetPasswordPage';
import { AuthCallbackHandler } from './AuthCallbackHandler';
import { useLocale } from '../../i18n/LocaleContext';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, user, authRequired, authConfigured, bootstrapping } = useAuth();
  const { t } = useLocale();

  return (
    <>
      <AuthCallbackHandler />
      {isPasswordRecoveryRoute() ? (
        <ResetPasswordPage />
      ) : !authRequired ? (
        children
      ) : !authConfigured ? (
        <AuthSetupPage />
      ) : loading || bootstrapping ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-[#09090b]">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">
            {bootstrapping ? t('auth.loadingProfile', 'Загрузка профиля…') : t('common.loading', 'Загрузка…')}
          </p>
        </div>
      ) : !user ? (
        <AuthPage />
      ) : (
        children
      )}
    </>
  );
};
