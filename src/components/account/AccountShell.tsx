import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Database,
  AlertTriangle,
  CreditCard,
  Plug,
} from 'lucide-react';
import type { AccountSectionId } from '../../domain/account/account-sections';
import { useLocale } from '../../i18n/LocaleContext';

const NAV: { id: AccountSectionId; icon: React.ReactNode }[] = [
  { id: 'overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'billing', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'integrations', icon: <Plug className="w-4 h-4" /> },
  { id: 'workspace', icon: <Building2 className="w-4 h-4" /> },
  { id: 'team', icon: <Users className="w-4 h-4" /> },
  { id: 'data', icon: <Database className="w-4 h-4" /> },
  { id: 'danger', icon: <AlertTriangle className="w-4 h-4" /> },
];

interface AccountShellProps {
  section: AccountSectionId;
  onSectionChange: (id: AccountSectionId) => void;
  subtitle: string;
  storageBadge: string;
  children: React.ReactNode;
}

export const AccountShell: React.FC<AccountShellProps> = ({
  section,
  onSectionChange,
  subtitle,
  storageBadge,
  children,
}) => {
  const { t } = useLocale();

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="pb-4 border-b border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t('account.title', 'Личный кабинет')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="inline-flex self-start px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
          {storageBadge}
        </span>
      </div>

      <div className="mt-5 flex flex-col lg:flex-row gap-5">
        <nav className="lg:w-52 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-semibold whitespace-nowrap transition-colors ${
                section === item.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              {item.icon}
              {t(`account.nav.${item.id}`, item.id)}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-4">{children}</div>
      </div>
    </div>
  );
};

export function AccountCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 space-y-3">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h2>
        {description && (
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function AccountAlerts({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (!error && !success) return null;
  return (
    <>
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
          {success}
        </div>
      )}
    </>
  );
}
