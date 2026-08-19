import React, { useEffect, useState } from 'react';
import { Bot, Search } from 'lucide-react';
import { AccountCard } from '../account/AccountShell';
import { useLocale } from '../../i18n/LocaleContext';
import type { PlatformAdminAiFarmRow } from '../../domain/admin/platform-admin.types';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import { fetchWorkspaceAiOverviewAdmin } from '../../data/adapters/supabase/admin-api';

interface AdminAiFarmsPanelProps {
  localMode: boolean;
  onOpenWorkspace: (workspaceId: string) => void;
}

export const AdminAiFarmsPanel: React.FC<AdminAiFarmsPanelProps> = ({ localMode, onOpenWorkspace }) => {
  const { t } = useLocale();
  const [rows, setRows] = useState<PlatformAdminAiFarmRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (localMode) {
      setRows([]);
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;
    setLoading(true);
    void fetchWorkspaceAiOverviewAdmin(client)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [localMode]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.workspaceName.toLowerCase().includes(q) || (r.ownerEmail ?? '').toLowerCase().includes(q);
  });

  return (
    <AccountCard
      title={t('account.admin.aiFarmsTitle', 'AI на фермах')}
      description={t('account.admin.aiFarmsHint', 'Обзор per-farm AI config. Детальная настройка — в карточке фермы.')}
    >
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('account.admin.searchFarms', 'Поиск фермы…')}
          className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
        />
      </div>
      {loading ? (
        <p className="text-xs text-slate-500">{t('common.loading', 'Загрузка…')}</p>
      ) : localMode ? (
        <p className="text-xs text-slate-500">{t('account.admin.aiFarmsLocal', 'Только в облачном режиме')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-500">{t('account.admin.aiFarmsEmpty', 'Нет данных')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-zinc-800">
                <th className="py-2 pr-3">{t('account.admin.colFarm', 'Ферма')}</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Managed</th>
                <th className="py-2 pr-3">AI</th>
                <th className="py-2">Provider</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.workspaceId}
                  className="border-b border-slate-50 dark:border-zinc-800/80 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                  onClick={() => onOpenWorkspace(row.workspaceId)}
                >
                  <td className="py-2.5 pr-3 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-violet-500" />
                      {row.workspaceName}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-500">{row.ownerEmail ?? '—'}</td>
                  <td className="py-2.5 pr-3">
                    {row.managedByPlatform ? (
                      <span className="text-[10px] font-bold text-violet-600">PLATFORM</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{row.aiEnabled ? 'ON' : 'OFF'}</td>
                  <td className="py-2.5">{row.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AccountCard>
  );
};
