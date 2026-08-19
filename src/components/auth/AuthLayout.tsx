import React from 'react';
import { useLocale } from '../../i18n/LocaleContext';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const { t } = useLocale();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#09090b] dark:to-zinc-950 px-4 py-10">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-1.5 mb-3">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">QBX</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quantum BotaniX</p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-lg shadow-slate-200/50 dark:shadow-none">
        {(title || subtitle) && (
          <div className="mb-6 text-center">
            {title && <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>}
            {subtitle && <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>

      <p className="mt-6 text-[11px] text-slate-400 max-w-sm text-center">
        {t('auth.passwordOnly', 'Вход только по email и паролю')}
      </p>
    </div>
  );
};
