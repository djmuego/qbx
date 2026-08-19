import React, { useState } from 'react';
import { Sprout, Play, Square } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import {
  completeGrowRun,
  getActiveGrowRun,
  loadGrowRuns,
  startGrowRun,
} from '../../application/grow/grow-run.store';
import { summarizeGrowRunTelemetry } from '../../application/grow/grow-run-telemetry.store';

export const GrowRunTile: React.FC = () => {
  const { currentSpaceId, cropProfile } = useApp();
  const { t } = useLocale();
  const [tick, setTick] = useState(0);

  if (!currentSpaceId) return null;

  const active = getActiveGrowRun(currentSpaceId);
  const history = loadGrowRuns(currentSpaceId).filter((r) => r.status !== 'active').slice(0, 2);
  const telemetry = active ? summarizeGrowRunTelemetry(currentSpaceId, active.id) : null;

  const startRun = () => {
    startGrowRun(currentSpaceId, {
      cropId: cropProfile?.cropId ?? 'custom',
      commonName: cropProfile?.commonName ?? t('growRun.defaultCrop', 'Мой гров'),
      cultivar: cropProfile?.cultivar,
      stage: 'vegetative',
    });
    setTick((n) => n + 1);
  };

  const endRun = () => {
    if (!active) return;
    completeGrowRun(currentSpaceId, active.id);
    setTick((n) => n + 1);
  };

  void tick;

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-lime-100 dark:bg-lime-950/50 text-lime-700 dark:text-lime-300">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold">{t('growRun.title', 'GrowRun')}</h2>
            <p className="text-[11px] text-slate-500">
              {t('growRun.hint', 'Цикл грова + накопление телеметрии (1 sample/мин)')}
            </p>
          </div>
        </div>
        {!active ? (
          <button
            type="button"
            onClick={startRun}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-lime-600 text-white"
          >
            <Play className="w-3.5 h-3.5" />
            {t('growRun.start', 'Старт')}
          </button>
        ) : (
          <button
            type="button"
            onClick={endRun}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-rose-200 text-rose-600"
          >
            <Square className="w-3.5 h-3.5" />
            {t('growRun.complete', 'Завершить')}
          </button>
        )}
      </div>

      {active ? (
        <div className="text-xs space-y-1">
          <p className="font-semibold text-slate-800 dark:text-zinc-200">{active.commonName}</p>
          <p className="text-slate-500">
            {t('growRun.stage', 'Фаза')}: {active.stage} · {t('growRun.samples', 'Сэмплов')}:{' '}
            {telemetry?.sampleCount ?? 0}
          </p>
        </div>
      ) : history.length > 0 ? (
        <ul className="text-[11px] text-slate-500 space-y-1">
          {history.map((run) => (
            <li key={run.id}>
              {run.commonName} — {run.status} ({run.startedAt.slice(0, 10)})
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-slate-500">{t('growRun.empty', 'Нет активного цикла')}</p>
      )}
    </div>
  );
};
