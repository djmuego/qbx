import React from 'react';
import { Zap, AlertTriangle, CheckCircle2, RotateCcw } from './Icons';

interface StatusBadgeProps {
  status?: 'normal' | 'low' | 'high' | 'attention';
  label?: string;
  className?: string;
}

export const SensorStatusBadge: React.FC<StatusBadgeProps> = ({ status = 'normal', label, className = '' }) => {
  if (status === 'low') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        {label || 'Низкая'}
      </span>
    );
  }

  if (status === 'high') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        {label || 'Высокая'}
      </span>
    );
  }

  if (status === 'attention') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60 ${className}`}>
        <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        {label || 'Внимание'}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {label || 'Норма'}
    </span>
  );
};

export const ModeBadge: React.FC<{ isAuto: boolean; className?: string }> = ({ isAuto, className = '' }) => {
  if (isAuto) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 ${className}`}>
        Авто
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 ${className}`}>
      <RotateCcw className="w-2.5 h-2.5" />
      Ручное
    </span>
  );
};

export const HighPowerBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 ${className}`}>
      <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-current" />
      Усиленный выход
    </span>
  );
};
