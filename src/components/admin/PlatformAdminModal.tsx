import React from 'react';
import { X, ShieldCheck } from '../common/Icons';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { AccountAdminSection } from '../account/sections/AccountAdminSection';

interface PlatformAdminModalProps {
  open: boolean;
  onClose: () => void;
}

export const PlatformAdminModal: React.FC<PlatformAdminModalProps> = ({ open, onClose }) => {
  const { t } = useLocale();
  const { isPlatformAdmin } = useAuth();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-50 dark:bg-[#09090b]">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold truncate">
              {t('account.admin.title', 'Админка платформы')}
            </h1>
            <p className="text-[11px] text-slate-500 truncate hidden sm:block">
              {t('account.admin.modalSubtitle', 'Отдельно от личного кабинета — пользователи и фермы QBX')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
          {t('common.close', 'Закрыть')}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          {isPlatformAdmin ? (
            <AccountAdminSection />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                {t('account.admin.forbidden', 'Нет прав platform admin')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
