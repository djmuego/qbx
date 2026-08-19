import React from 'react';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '../../../i18n/types';
import { useLocale } from '../../../i18n/LocaleContext';
import { AccountCard } from '../AccountShell';
import type { AccountActions } from '../useAccountActions';

export const AccountProfileSection: React.FC<{ actions: AccountActions }> = ({ actions }) => {
  const { t, locale, setLocale } = useLocale();
  const { user, profile, name, setName, saveProfile, updateLocale } = actions;

  const changeLocale = (next: Locale) => {
    setLocale(next);
    void updateLocale(next);
  };

  return (
    <AccountCard title={t('account.profile', 'Профиль')} description={t('account.profileHint', '')}>
      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
        Email
        <input
          readOnly
          value={user?.email ?? ''}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800/80 text-sm text-slate-500"
        />
      </label>
      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
        {t('auth.name', 'Имя')}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
          placeholder={t('auth.namePlaceholder', 'Как к вам обращаться')}
        />
      </label>
      <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
        {t('account.locale', 'Язык интерфейса')}
        <select
          value={profile?.locale ?? locale}
          onChange={(e) => changeLocale(e.target.value as Locale)}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
        >
          {SUPPORTED_LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_LABELS[code]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => void saveProfile()}
        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
      >
        {t('account.saveName', 'Сохранить')}
      </button>
    </AccountCard>
  );
};
