import React from 'react';
import { useLocale } from '../../../i18n/LocaleContext';
import { AccountCard } from '../AccountShell';
import { AccountPasswordForm } from '../AccountPasswordForm';
import type { AccountActions } from '../useAccountActions';

export const AccountSecuritySection: React.FC<{ actions: AccountActions }> = ({ actions }) => {
  const { t } = useLocale();
  const { localAuthEnabled, cloudReady } = actions;

  return (
    <>
      <AccountCard title={t('account.security.session', 'Сессия')} description={t('account.security.sessionHint', '')}>
        <ul className="text-xs text-slate-600 dark:text-zinc-300 space-y-1.5">
          <li>• {t('account.security.emailLogin', 'Вход по email и паролю')}</li>
          <li>
            •{' '}
            {localAuthEnabled
              ? t('account.security.localPersist', 'Сессия сохраняется в этом браузере')
              : t('account.security.cloudPersist', 'Сессия управляется Supabase Auth')}
          </li>
          {cloudReady && <li>• {t('account.security.rls', 'Данные защищены RLS в Postgres')}</li>}
        </ul>
      </AccountCard>
      <AccountPasswordForm />
    </>
  );
};
