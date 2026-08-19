import React, { useEffect, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import { getRecentJournalEntries } from '../../application/ai/grow-journal.store';
import { GrowJournalModal } from '../modals/GrowJournalModal';

export const GrowJournalTile: React.FC = () => {
  const { currentSpaceId } = useApp();
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const entries = currentSpaceId ? getRecentJournalEntries(currentSpaceId, 3) : [];

  useEffect(() => {
    const onJournal = () => setTick((n) => n + 1);
    window.addEventListener('qbx-journal-updated', onJournal);
    return () => window.removeEventListener('qbx-journal-updated', onJournal);
  }, []);

  void tick;

  const formatWhen = (ms: number) =>
    new Date(ms).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">{t('journal.title', 'Grow Journal')}</h2>
              <p className="text-[11px] text-slate-500">{t('journal.hint', 'История грова, AI и ваши заметки')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('journal.add', 'Заметка')}
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-slate-500 py-2">{t('journal.empty', 'Записей пока нет — добавьте заметку или спросите Agent.')}</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 line-clamp-1">{entry.title}</p>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatWhen(entry.timestampMs)}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{entry.body}</p>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
        >
          {t('journal.viewAll', 'Весь журнал')}
        </button>
      </div>

      <GrowJournalModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};
