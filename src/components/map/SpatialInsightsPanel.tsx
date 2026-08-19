import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Lightbulb, MapPin, Sparkles } from 'lucide-react';
import type { SpatialContext, SpatialInsight } from '../../domain/map/spatial-intelligence.types';
import { insightSeverity, sortSpatialInsights } from '../../domain/map/spatial-insight-policy';
import { useLocale } from '../../i18n/LocaleContext';

interface SpatialInsightsPanelProps {
  context: SpatialContext | null;
  onShowSuggestion?: (position: { xM: number; yM: number }, insight: SpatialInsight) => void;
  onAskAgent?: (prompt: string) => void;
  readOnly?: boolean;
}

function coverageTone(label: SpatialContext['coverageLabel']): string {
  switch (label) {
    case 'Хорошее':
      return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
    case 'Требует внимания':
      return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    default:
      return 'text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700';
  }
}

function dataKindLabel(kind: SpatialInsight['dataKind'], t: (key: string, fb: string) => string): string {
  const map: Record<SpatialInsight['dataKind'], string> = {
    FACT: t('map.insights.dataFact', 'Факт'),
    DERIVED: t('map.insights.dataDerived', 'Расчёт'),
    INTERPOLATED: t('map.insights.dataInterpolated', 'Интерполяция'),
    AI_INFERENCE: t('map.insights.dataInference', 'Эвристика'),
    UNKNOWN: t('map.insights.dataUnknown', 'Нет данных'),
  };
  return map[kind];
}

export const SpatialInsightsPanel: React.FC<SpatialInsightsPanelProps> = ({
  context,
  onShowSuggestion,
  onAskAgent,
  readOnly,
}) => {
  const { t } = useLocale();
  const [open, setOpen] = useState(true);

  const insights = useMemo(
    () => sortSpatialInsights(context?.insights ?? []),
    [context?.insights],
  );

  if (!context) return null;

  const attentionCount = insights.filter((i) => insightSeverity(i.kind) === 'attention').length;
  const recCount = insights.filter((i) => i.kind === 'placement_recommendation').length;

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {t('map.insights.title', 'Пространственный анализ')}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            {t('map.insights.subtitle', 'Рекомендации по карте — без автоматического перемещения объектов.')}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold border ${coverageTone(context.coverageLabel)}`}
        >
          {context.coverageLabel}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex flex-wrap gap-2 pt-3 text-[11px]">
            <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              {insights.length} {t('map.insights.signals', 'сигналов')}
            </span>
            {attentionCount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-semibold">
                {attentionCount} {t('map.insights.needAttention', 'требуют внимания')}
              </span>
            )}
            {recCount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-200 font-semibold">
                {recCount} {t('map.insights.recommendations', 'рекомендации')}
              </span>
            )}
          </div>

          {insights.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">{t('map.insights.empty', 'Критичных замечаний по карте нет.')}</p>
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {insights.map((item) => {
                const severity = insightSeverity(item.kind);
                const Icon = severity === 'recommendation' ? Lightbulb : severity === 'attention' ? AlertTriangle : MapPin;
                return (
                  <li
                    key={`${item.kind}-${item.title}-${item.zoneId ?? ''}`}
                    className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/40"
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          severity === 'attention'
                            ? 'text-amber-600'
                            : severity === 'recommendation'
                              ? 'text-violet-600'
                              : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100">{item.title}</p>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5 leading-relaxed">{item.detail}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {dataKindLabel(item.dataKind, t)}
                          </span>
                          <span className="text-[10px] text-slate-400">· {item.confidence}</span>
                        </div>
                        {item.suggestedPosition && onShowSuggestion && !readOnly && (
                          <button
                            type="button"
                            onClick={() => onShowSuggestion(item.suggestedPosition!, item)}
                            className="mt-2 text-[11px] font-semibold text-violet-700 dark:text-violet-300 hover:underline"
                          >
                            {t('map.insights.showOnMap', 'Показать на карте')}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {onAskAgent && insights.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onAskAgent(
                  t(
                    'map.insights.agentPrompt',
                    'Проанализируй пространственную карту: зоны, датчики, растения. Дай рекомендации по размещению. Не выдумывай показания и не перемещай объекты сам.',
                  ),
                )
              }
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              {t('map.insights.askAgent', 'Спросить QBX Agent')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
