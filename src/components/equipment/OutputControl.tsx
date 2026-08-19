import React from 'react';
import type { OutputTwinMode } from '../../domain/equipment/output-twin-mode';
import { useLocale } from '../../i18n/LocaleContext';

interface OutputControlProps {
  mode: OutputTwinMode;
  onChange: (mode: OutputTwinMode) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
}

const sizeClasses = {
  sm: 'text-[10px] px-2 py-1',
  md: 'text-xs px-3 py-1.5',
} as const;

export const OutputControl: React.FC<OutputControlProps> = ({
  mode,
  onChange,
  disabled = false,
  size = 'sm',
  className = '',
  onClick,
}) => {
  const { t } = useLocale();
  const btn = sizeClasses[size];

  const segments: { id: OutputTwinMode; label: string; active: string; idle: string }[] = [
    {
      id: 'off',
      label: t('twinControl.off', 'Выкл'),
      active: 'bg-slate-700 text-white shadow-2xs dark:bg-zinc-200 dark:text-zinc-900',
      idle: 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200',
    },
    {
      id: 'on',
      label: t('twinControl.on', 'Вкл'),
      active: 'bg-emerald-600 text-white shadow-2xs',
      idle: 'text-slate-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-300',
    },
    {
      id: 'auto',
      label: t('twinControl.auto', 'Авто'),
      active: 'bg-sky-600 text-white shadow-2xs dark:bg-sky-500',
      idle: 'text-slate-600 dark:text-zinc-400 hover:text-sky-700 dark:hover:text-sky-300',
    },
  ];

  return (
    <div
      role="group"
      aria-label={t('twinControl.groupLabel', 'Режим управления')}
      onClick={onClick}
      className={`inline-flex w-full max-w-full items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 ${className}`}
    >
      {segments.map((segment) => (
        <button
          key={segment.id}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (segment.id !== mode) onChange(segment.id);
          }}
          className={`flex-1 min-w-0 rounded-md font-bold transition-all ${btn} ${
            mode === segment.id ? segment.active : segment.idle
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-pressed={mode === segment.id}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
};
