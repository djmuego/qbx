import React, { useCallback, useMemo, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Droplets, Gauge, Loader2, MessageSquare, Sun, Thermometer } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleContext';
import { useApp } from '../../context/AppContext';
import type { GrowContext } from '../../domain/ai/grow-context.types';
import { buildGrowTelemetryContext } from '../../application/ai/ai-assistant.service';
import { adviseGrower } from '../../application/ai/advise.service';

const QUICK_PROMPTS = [
  { id: 'vpd', labelKey: 'map.advisor.chipVpd', fallback: 'Проверить VPD', prompt: 'Оцени текущий VPD для моей стадии и что изменить в климате?' },
  { id: 'water', labelKey: 'map.advisor.chipWater', fallback: 'Когда поливать?', prompt: 'Когда и сколько поливать при текущих показаниях субстрата и фазы?' },
  { id: 'energy', labelKey: 'map.advisor.chipEnergy', fallback: 'Энергопотребление', prompt: 'Оцени энергопотребление света и вентиляции — что оптимизировать?' },
  { id: 'stress', labelKey: 'map.advisor.chipStress', fallback: 'Признаки стресса', prompt: 'Какие признаки стресса возможны при текущих параметрах и что проверить первым?' },
] as const;

interface TwinAiAdvisorWidgetProps {
  growContext: GrowContext;
  onAsk: (prompt: string) => void;
  disabled?: boolean;
}

export const TwinAiAdvisorWidget: React.FC<TwinAiAdvisorWidgetProps> = ({
  growContext,
  onAsk,
  disabled,
}) => {
  const { t } = useLocale();
  const { aiSettings, cropProfile } = useApp();
  const [open, setOpen] = React.useState(true);
  const [loading, setLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [lastMeta, setLastMeta] = useState<{ source: string; chunks: number } | null>(null);
  const telemetry = useMemo(() => buildGrowTelemetryContext(growContext), [growContext]);

  const runAdvise = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || disabled) return;
      setLastQuestion(trimmed);
      setLoading(true);
      setLastAnswer(null);
      setLastMeta(null);
      try {
        const result = await adviseGrower({
          question: trimmed,
          growContext,
          cropProfile,
          settings: aiSettings,
        });
        setLastAnswer(result.answer);
        setLastMeta({
          source: result.source,
          chunks: result.knowledgeChunkCount,
        });
      } catch (e) {
        setLastAnswer(e instanceof Error ? e.message : 'Advisor unavailable');
      } finally {
        setLoading(false);
      }
    },
    [disabled, growContext, cropProfile, aiSettings],
  );

  const handleChip = (prompt: string) => {
    void runAdvise(prompt);
  };

  const handleFullChat = (prompt: string) => {
    void runAdvise(prompt);
    onAsk(prompt);
  };

  return (
    <div className="rounded-2xl border border-violet-200/80 dark:border-violet-900/60 bg-gradient-to-br from-violet-50/90 via-white to-white dark:from-violet-950/30 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="p-2 rounded-xl bg-violet-600 text-white shrink-0">
          <Bot className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {t('map.advisor.title', 'QBX AI Advisor')}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            {t('map.advisor.subtitle', 'RAG на базе знаний + живая телеметрия бокса')}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-violet-100 dark:border-violet-900/40">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <TelemetryChip
              icon={<Thermometer className="w-3 h-3" />}
              label={t('map.advisor.temp', 'Темп.')}
              value={telemetry.tempC != null ? `${telemetry.tempC.toFixed(1)}°C` : '—'}
            />
            <TelemetryChip
              icon={<Droplets className="w-3 h-3" />}
              label={t('map.advisor.rh', 'Влажн.')}
              value={telemetry.humidityPct != null ? `${telemetry.humidityPct.toFixed(0)}%` : '—'}
            />
            <TelemetryChip
              icon={<Gauge className="w-3 h-3" />}
              label="VPD"
              value={telemetry.vpdKpa != null ? `${telemetry.vpdKpa.toFixed(2)} kPa` : '—'}
            />
            <TelemetryChip
              icon={<Sun className="w-3 h-3" />}
              label={t('map.advisor.light', 'Свет')}
              value={telemetry.lightStatus}
            />
          </div>

          <p className="text-[11px] text-slate-500">
            {t('map.advisor.stage', 'Фаза')}: <span className="font-semibold text-slate-700 dark:text-zinc-300">{telemetry.stage}</span>
            {telemetry.soilMoisturePct != null && (
              <>
                {' · '}
                {t('map.advisor.substrate', 'Субстрат')}: {telemetry.soilMoisturePct.toFixed(0)}%
              </>
            )}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={disabled || loading}
                onClick={() => handleChip(chip.prompt)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-200 disabled:opacity-40"
              >
                {t(chip.labelKey, chip.fallback)}
              </button>
            ))}
          </div>

          {(loading || lastAnswer) && (
            <div className="rounded-xl border border-violet-100 dark:border-violet-900/50 bg-white/90 dark:bg-zinc-900/80 p-3 text-xs">
              {loading ? (
                <p className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('map.advisor.thinking', 'Анализ…')}
                </p>
              ) : (
                <>
                  {lastQuestion && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mb-1 truncate">
                      {lastQuestion}
                    </p>
                  )}
                  <p className="text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{lastAnswer}</p>
                  {lastMeta && (
                    <p className="text-[10px] text-slate-400 mt-2">
                      {lastMeta.source === 'local'
                        ? t('map.advisor.localExpert', 'локальный эксперт')
                        : t('map.advisor.gateway', 'AI')}
                      {lastMeta.chunks > 0 && (
                        <>
                          {' · '}
                          {lastMeta.chunks} {t('map.advisor.ragChunks', 'источников KB')}
                        </>
                      )}
                    </p>
                  )}
                  {lastQuestion && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onAsk(lastQuestion)}
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300 hover:underline"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {t('map.advisor.openChat', 'Открыть в чате агента')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={disabled || loading}
            onClick={() =>
              handleFullChat(t('map.advisor.defaultPrompt', 'Что сейчас важнее всего для моего бокса?'))
            }
            className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40"
          >
            {t('map.advisor.ask', 'Спросить AI-агронома')}
          </button>
        </div>
      )}
    </div>
  );
};

function TelemetryChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-100 dark:border-zinc-800 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
        {icon}
        {label}
      </div>
      <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{value}</p>
    </div>
  );
}
