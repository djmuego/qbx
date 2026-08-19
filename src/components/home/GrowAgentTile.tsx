import React from 'react';
import { useApp } from '../../context/AppContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { Bot, ChevronRight, RefreshCw, Sparkles } from '../common/Icons';
import type { AgentStatus } from '../../domain/ai/agent.types';
import { useLocale } from '../../i18n/LocaleContext';

const STATUS_STYLES: Record<
  AgentStatus,
  { dot: string; badge: string; border: string }
> = {
  ok: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    border: 'hover:border-violet-500/40 dark:hover:border-violet-500/30',
  },
  attention: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
    border: 'hover:border-amber-500/40 dark:hover:border-amber-500/30',
  },
  critical: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60',
    border: 'hover:border-rose-500/40 dark:hover:border-rose-500/30',
  },
  waiting: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200/60 dark:border-violet-800/60',
    border: 'hover:border-violet-500/40 dark:hover:border-violet-500/30',
  },
};

function formatRelativeTime(
  ms: number,
  t: (key: string, fallback?: string) => string,
  tv: (key: string, vars: Record<string, string | number>, fallback?: string) => string,
  locale: string,
): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return t('home.agentJustNow', 'только что');
  if (diff < 3_600_000) return tv('home.agentMinAgo', { count: Math.floor(diff / 60_000) }, '');
  if (diff < 86_400_000) return tv('home.agentHourAgo', { count: Math.floor(diff / 3_600_000) }, '');
  return new Date(ms).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL_KEYS: Record<AgentStatus, string> = {
  ok: 'home.agentStatusOk',
  attention: 'home.agentStatusAttention',
  critical: 'home.agentStatusCritical',
  waiting: 'home.agentStatusWaiting',
};

export const GrowAgentTile: React.FC = () => {
  const {
    agentDisplayBriefing,
    agentLoading,
    refreshAgentBriefing,
    setIsAgentOpen,
  } = useApp();
  const { isFeatureAvailable, requestUpgrade } = useSubscription();
  const { t, tv, locale } = useLocale();

  const briefing = agentDisplayBriefing;
  const styles = STATUS_STYLES[briefing.status];

  return (
    <div
      className={`group rounded-2xl bg-gradient-to-br from-violet-50/80 via-white to-white dark:from-violet-950/20 dark:via-zinc-900 dark:to-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs transition-all cursor-pointer ${styles.border}`}
      onClick={() => {
        if (!isFeatureAvailable('AI_GROW_ADVISOR')) {
          requestUpgrade('AI_GROW_ADVISOR');
          return;
        }
        setIsAgentOpen(true);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 shrink-0">
            <Bot className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                QBX Agent
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                {t(STATUS_LABEL_KEYS[briefing.status], briefing.status)}
              </span>
            </div>

            <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">
              {briefing.headline}
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
              {briefing.summary}
            </p>

            {briefing.generatedAtMs > 0 && (
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2">
                Локальный эксперт · {formatRelativeTime(briefing.generatedAtMs, t, tv, locale)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void refreshAgentBriefing();
            }}
            disabled={agentLoading}
            className="p-2 rounded-xl text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 border border-transparent hover:border-violet-200 dark:hover:border-violet-800 transition-all disabled:opacity-50"
            title={t('home.agentRefresh', 'Обновить')}
          >
            <RefreshCw className={`w-4 h-4 ${agentLoading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 group-hover:underline flex items-center gap-0.5 justify-end">
            {t('home.agentOpen', 'Открыть')}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {briefing.nextSteps.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
            <Sparkles className="w-3 h-3 text-violet-500" />
            Следующий шаг
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
            {briefing.nextSteps[0]}
          </p>
        </div>
      )}
    </div>
  );
};
