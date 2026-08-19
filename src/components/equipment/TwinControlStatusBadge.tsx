import React from 'react';
import { AlertTriangle, Clock, RotateCcw, ShieldAlert, Zap } from '../common/Icons';
import type { OutputControlStatus } from '../../domain/equipment/output-control-status';
import { useLocale } from '../../i18n/LocaleContext';

interface TwinControlStatusBadgeProps {
  status: OutputControlStatus;
  className?: string;
}

export const TwinControlStatusBadge: React.FC<TwinControlStatusBadgeProps> = ({ status, className = '' }) => {
  const { t } = useLocale();

  const config: Record<
    OutputControlStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    rule: {
      label: t('twinControl.statusRule', 'По правилу'),
      className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200/70 dark:border-sky-800/60',
      icon: <Zap className="w-2.5 h-2.5" />,
    },
    manual: {
      label: t('twinControl.statusManual', 'Ручной перехват'),
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60',
      icon: <RotateCcw className="w-2.5 h-2.5" />,
    },
    safety_timeout: {
      label: t('twinControl.statusSafetyTimeout', 'Аварийный тайм-аут'),
      className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60',
      icon: <ShieldAlert className="w-2.5 h-2.5" />,
    },
    pending: {
      label: t('twinControl.statusPending', 'Команда…'),
      className: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200/70 dark:border-zinc-700/60',
      icon: <Clock className="w-2.5 h-2.5 animate-pulse" />,
    },
    failed: {
      label: t('twinControl.statusFailed', 'Ошибка команды'),
      className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60',
      icon: <AlertTriangle className="w-2.5 h-2.5" />,
    },
  };

  const item = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${item.className} ${className}`}
    >
      {item.icon}
      {item.label}
    </span>
  );
};
