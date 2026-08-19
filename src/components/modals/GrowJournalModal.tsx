import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import {
  addGrowJournalNote,
  loadGrowJournal,
} from '../../application/ai/grow-journal.store';
import type { GrowJournalEntry } from '../../domain/grow/grow-journal.types';

interface GrowJournalModalProps {
  open: boolean;
  onClose: () => void;
}

function notifyJournalUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('qbx-journal-updated'));
  }
}

export const GrowJournalModal: React.FC<GrowJournalModalProps> = ({ open, onClose }) => {
  const { currentSpaceId } = useApp();
  const { t, locale } = useLocale();
  const [entries, setEntries] = useState<GrowJournalEntry[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!open || !currentSpaceId) return;
    setEntries(loadGrowJournal(currentSpaceId));
  }, [open, currentSpaceId]);

  const formatWhen = (ms: number) =>
    new Date(ms).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleAdd = () => {
    if (!currentSpaceId || !body.trim()) return;
    addGrowJournalNote(currentSpaceId, title, body);
    setEntries(loadGrowJournal(currentSpaceId));
    setTitle('');
    setBody('');
    notifyJournalUpdated();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('journal.title', 'Grow Journal')}
      subtitle={t('journal.modalHint', 'Хронология пространства — заметки, AI и события')}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('journal.noteTitle', 'Заголовок')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={t('journal.noteBody', 'Что произошло в грове?')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 resize-y"
          />
          <button
            type="button"
            disabled={!body.trim()}
            onClick={handleAdd}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            {t('journal.saveNote', 'Сохранить заметку')}
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-slate-500">{t('journal.empty', 'Записей пока нет')}</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{entry.title}</p>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatWhen(entry.timestampMs)}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 whitespace-pre-wrap">{entry.body}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-2">{entry.kind}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};
