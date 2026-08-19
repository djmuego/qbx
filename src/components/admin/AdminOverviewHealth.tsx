import React, { useEffect, useState } from 'react';
import { Activity, BookOpen, Cloud, Database, Users } from 'lucide-react';
import { AccountCard } from '../account/AccountShell';
import { useLocale } from '../../i18n/LocaleContext';
import type { PlatformAdminKnowledgeStats, PlatformAdminStats } from '../../domain/admin/platform-admin.types';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import { fetchKnowledgeStatsAdmin } from '../../data/adapters/supabase/admin-api';

interface AdminOverviewHealthProps {
  stats: PlatformAdminStats | null;
  localMode: boolean;
  cloudReady: boolean;
  onOpenTab: (tab: 'knowledge' | 'users' | 'audit') => void;
}

export const AdminOverviewHealth: React.FC<AdminOverviewHealthProps> = ({
  stats,
  localMode,
  cloudReady,
  onOpenTab,
}) => {
  const { t } = useLocale();
  const [kbStats, setKbStats] = useState<PlatformAdminKnowledgeStats | null>(null);

  useEffect(() => {
    if (localMode) {
      setKbStats({ articleCount: 0, publishedCount: 0, chunkCount: 0, categoryCount: 6, lastArticleUpdate: null });
      return;
    }
    const client = getSupabaseClient();
    if (!client) return;
    void fetchKnowledgeStatsAdmin(client)
      .then(setKbStats)
      .catch(() => setKbStats(null));
  }, [localMode]);

  return (
    <div className="space-y-4">
      {localMode && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          {t('account.admin.localModeBanner', 'Локальный режим: данные только из браузера. Для prod-операций подключите Supabase.')}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: t('account.admin.statsUsers', 'Пользователи'), value: stats.userCount, icon: Users },
            { label: t('account.admin.statsWorkspaces', 'Фермы'), value: stats.workspaceCount, icon: Database },
            { label: t('account.admin.statsAdmins', 'Админы'), value: stats.platformAdminCount, icon: Cloud },
            { label: t('account.admin.statsPro', 'Pro'), value: stats.proWorkspaceCount ?? 0, icon: Activity },
            { label: t('account.admin.statsTrialing', 'Триал'), value: stats.trialingCount ?? 0, icon: Activity },
            { label: t('account.admin.statsDisabled', 'Блок'), value: stats.disabledUserCount ?? 0, icon: Users },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800"
            >
              <item.icon className="w-4 h-4 text-slate-400 mb-2" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <AccountCard title={t('account.admin.systemHealth', 'Состояние системы')} description="">
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <HealthRow
            label={t('account.admin.healthCloud', 'Supabase')}
            ok={cloudReady && !localMode}
            detail={localMode ? 'local' : cloudReady ? 'connected' : 'not configured'}
          />
          <HealthRow
            label={t('account.admin.healthKb', 'Knowledge Base')}
            ok={Boolean(kbStats && kbStats.chunkCount > 0)}
            detail={
              kbStats
                ? `${kbStats.articleCount} articles · ${kbStats.chunkCount} chunks`
                : 'no data'
            }
            action={() => onOpenTab('knowledge')}
            actionLabel={t('account.admin.openKnowledge', 'Открыть')}
          />
          <HealthRow
            label={t('account.admin.healthRag', 'RAG index')}
            ok={Boolean(kbStats && kbStats.chunkCount > 0)}
            detail={kbStats?.lastArticleUpdate ? `updated ${new Date(kbStats.lastArticleUpdate).toLocaleDateString()}` : 'run kb:sync'}
          />
          <HealthRow
            label="Migrations"
            ok={cloudReady}
            detail="006–012 required for full admin"
          />
        </div>
      </AccountCard>
    </div>
  );
};

function HealthRow({
  label,
  ok,
  detail,
  action,
  actionLabel,
}: {
  label: string;
  ok: boolean;
  detail: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
      <div>
        <p className="font-semibold text-slate-800 dark:text-zinc-200">{label}</p>
        <p className="text-[11px] text-slate-500">{detail}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {action && actionLabel && (
          <button type="button" onClick={action} className="text-[10px] font-semibold text-emerald-700">
            {actionLabel}
          </button>
        )}
        <span className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </div>
    </div>
  );
}
