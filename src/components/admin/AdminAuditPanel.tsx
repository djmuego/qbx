import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { AccountCard } from '../account/AccountShell';
import { useLocale } from '../../i18n/LocaleContext';
import type { PlatformAuditLogRow } from '../../domain/admin/platform-admin.types';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import { fetchAuditLogFiltered } from '../../data/adapters/supabase/admin-api';

interface AdminAuditPanelProps {
  localMode: boolean;
  fallbackLog: PlatformAuditLogRow[];
  onExport: () => void;
  auditActionLabel: (action: string) => string;
  formatDateTime: (value: string) => string;
}

const PAGE_SIZE = 50;

export const AdminAuditPanel: React.FC<AdminAuditPanelProps> = ({
  localMode,
  fallbackLog,
  onExport,
  auditActionLabel,
  formatDateTime,
}) => {
  const { t } = useLocale();
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<PlatformAuditLogRow[]>(fallbackLog);
  const [total, setTotal] = useState(fallbackLog.length);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (localMode) {
      const q = search.trim().toLowerCase();
      const filtered = fallbackLog.filter((e) => {
        if (actionFilter && e.action !== actionFilter) return false;
        if (!q) return true;
        return (
          e.action.toLowerCase().includes(q) ||
          (e.actorEmail ?? '').toLowerCase().includes(q) ||
          (e.targetId ?? '').toLowerCase().includes(q)
        );
      });
      setTotal(filtered.length);
      setRows(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;
    setLoading(true);
    try {
      const result = await fetchAuditLogFiltered(client, {
        action: actionFilter || undefined,
        search: search || undefined,
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setRows(result.rows);
      setTotal(result.totalCount);
    } finally {
      setLoading(false);
    }
  }, [localMode, fallbackLog, actionFilter, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const actions = [...new Set(fallbackLog.map((e) => e.action))].sort();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AccountCard
      title={t('account.admin.auditTitle', 'Журнал действий')}
      description={t('account.admin.auditHint', 'Блокировки, баны, удаление ферм, platform admin.')}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
        >
          <option value="">{t('account.admin.auditAllActions', 'Все действия')}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {auditActionLabel(a)}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={t('account.admin.auditSearch', 'Поиск…')}
          className="flex-1 min-w-[140px] px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
        />
        <button
          type="button"
          onClick={() => onExport()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          {t('account.admin.exportAudit', 'Экспорт JSON')}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">{t('common.loading', 'Загрузка…')}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-500">{t('account.admin.auditEmpty', 'Записей нет')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((entry) => (
            <li
              key={entry.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-800 dark:text-zinc-200">{auditActionLabel(entry.action)}</p>
                <span className="text-[10px] text-slate-400 shrink-0">{formatDateTime(entry.createdAt)}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {entry.actorEmail ?? entry.actorName ?? '—'} → {entry.targetType}
                {entry.targetId ? ` ${entry.targetId.slice(0, 8)}…` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
        <span>
          {total} {t('account.admin.auditTotal', 'записей')} · {t('account.admin.page', 'стр.')} {page + 1}/{pageCount}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded-lg border disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded-lg border disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </AccountCard>
  );
};
