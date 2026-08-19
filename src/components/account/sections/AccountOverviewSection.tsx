import React from 'react';
import { useApp } from '../../../context/AppContext';
import { useLocale } from '../../../i18n/LocaleContext';
import { AccountCard } from '../AccountShell';
import { AccountProfileSection } from './AccountProfileSection';
import { AccountSecuritySection } from './AccountSecuritySection';
import type { AccountActions } from '../useAccountActions';

export const AccountOverviewSection: React.FC<{
  actions: AccountActions;
  onNavigate?: (section: import('../../../domain/account/account-sections').AccountSectionId) => void;
}> = ({ actions, onNavigate }) => {
  const { t } = useLocale();
  const { spaces, devices } = useApp();
  const { user, profile, activeRole, activeWs, roleLabel, localAuthEnabled, cloudReady } = actions;

  const initials = (profile?.displayName ?? user?.email ?? '?')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <>
      <AccountCard title={t('account.overview.title', 'Обзор')} description={t('account.overview.hint', '')}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg font-bold shrink-0">
            {initials || 'Q'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold truncate">{profile?.displayName || '—'}</p>
            <p className="text-sm text-slate-500 truncate">{user?.email}</p>
            <p className="text-xs text-slate-400 mt-1">
              {t('account.role', 'Роль')}: {activeRole ? roleLabel(activeRole) : '—'}
            </p>
          </div>
        </div>
      </AccountCard>

      <div className="grid sm:grid-cols-2 gap-3">
        <AccountCard title={t('account.overview.farm', 'Активная ферма')}>
          <p className="text-sm font-semibold">{activeWs?.name ?? '—'}</p>
          <p className="text-xs text-slate-500 mt-1">{t('account.overview.farmHint', 'Workspace для данных QBX')}</p>
        </AccountCard>
        <AccountCard title={t('account.overview.storage', 'Хранение')}>
          <p className="text-sm font-semibold">
            {cloudReady
              ? t('account.data.storageCloud', 'Облако Supabase')
              : localAuthEnabled
                ? t('account.data.storageLocal', 'Локально в браузере')
                : t('account.overview.offline', 'Офлайн')}
          </p>
        </AccountCard>
      </div>

      <AccountProfileSection actions={actions} />
      <AccountSecuritySection actions={actions} />

      {onNavigate && (
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { id: 'billing' as const, label: t('account.nav.billing', 'Подписка') },
            { id: 'integrations' as const, label: t('account.nav.integrations', 'Интеграции') },
            { id: 'data' as const, label: t('account.nav.data', 'Данные') },
            { id: 'danger' as const, label: t('account.nav.danger', 'Выход') },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800/50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <AccountCard title={t('account.overview.stats', 'Данные workspace')}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('account.overview.spaces', 'Пространства'), value: spaces.length },
            { label: t('account.overview.devices', 'Устройства'), value: devices.length },
            { label: t('account.overview.workspaces', 'Фермы'), value: actions.workspaces.length },
            { label: t('account.overview.members', 'Участники'), value: actions.members.length || 1 },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 text-center">
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-[11px] text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </AccountCard>
    </>
  );
};
