import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import {
  getActiveGrowRun,
  loadGrowRuns,
  updateGrowRunStage,
} from '../../application/grow/grow-run.store';
import {
  exportGrowRunTelemetryJson,
  loadGrowRunTelemetry,
  summarizeGrowRunTelemetry,
} from '../../application/grow/grow-run-telemetry.store';
import { GROW_STAGE_LABELS, type GrowStageId } from '../../domain/grow/grow-stage.types';

interface GrowRunDetailModalProps {
  open: boolean;
  onClose: () => void;
}

const STAGE_OPTIONS = Object.keys(GROW_STAGE_LABELS) as GrowStageId[];

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <p className="text-[11px] text-slate-500">—</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-0.5 h-12">
      {values.map((value, idx) => {
        const height = 20 + Math.round(((value - min) / range) * 80);
        return (
          <div
            key={`${idx}-${value}`}
            className="flex-1 min-w-[2px] rounded-sm bg-lime-500/70 dark:bg-lime-400/60"
            style={{ height: `${height}%` }}
            title={`${value.toFixed(1)}`}
          />
        );
      })}
    </div>
  );
}

export const GrowRunDetailModal: React.FC<GrowRunDetailModalProps> = ({ open, onClose }) => {
  const { currentSpaceId } = useApp();
  const { t, locale } = useLocale();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onUpdated = () => setRevision((n) => n + 1);
    window.addEventListener('qbx-grow-run-updated', onUpdated);
    return () => window.removeEventListener('qbx-grow-run-updated', onUpdated);
  }, [open]);

  void revision;

  const active = currentSpaceId ? getActiveGrowRun(currentSpaceId) : null;
  const history = currentSpaceId ? loadGrowRuns(currentSpaceId).filter((r) => r.status !== 'active') : [];
  const run = active ?? history[0] ?? null;

  const samples = useMemo(
    () => (currentSpaceId && run ? loadGrowRunTelemetry(currentSpaceId, run.id) : []),
    [currentSpaceId, run],
  );
  const summary = currentSpaceId && run ? summarizeGrowRunTelemetry(currentSpaceId, run.id) : null;

  const tempSeries = useMemo(
    () =>
      samples
        .slice(-48)
        .map((s) => s.tempC)
        .filter((v): v is number => v != null),
    [samples],
  );

  const formatWhen = (ms: number | null) =>
    ms
      ? new Date(ms).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const exportJson = () => {
    if (!currentSpaceId || !run) return;
    const blob = new Blob([exportGrowRunTelemetryJson(currentSpaceId, run.id)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `growrun-${run.id}-telemetry.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const onStageChange = (stage: GrowStageId) => {
    if (!currentSpaceId || !run || run.status !== 'active') return;
    updateGrowRunStage(currentSpaceId, run.id, stage);
    setRevision((n) => n + 1);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={t('growRun.detailTitle', 'GrowRun — телеметрия')}>
      {!run ? (
        <p className="text-xs text-slate-500">{t('growRun.empty', 'Нет активного цикла')}</p>
      ) : (
        <div className="space-y-4 text-xs">
          <div>
            <p className="font-bold text-slate-800 dark:text-zinc-100">{run.commonName}</p>
            <p className="text-slate-500 mt-1">
              {t('growRun.status', 'Статус')}: {run.status} · {t('growRun.samples', 'Сэмплов')}:{' '}
              {summary?.sampleCount ?? 0}
            </p>
            <p className="text-slate-500">
              {formatWhen(summary?.firstSampleAt ?? null)} → {formatWhen(summary?.lastSampleAt ?? null)}
            </p>
          </div>

          {run.status === 'active' && (
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                {t('growRun.stage', 'Фаза')}
              </span>
              <select
                value={run.stage}
                onChange={(e) => onStageChange(e.target.value as GrowStageId)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
              >
                {STAGE_OPTIONS.map((stage) => (
                  <option key={stage} value={stage}>
                    {GROW_STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
              {t('growRun.tempChart', 'Температура (последние сэмплы)')}
            </p>
            <Sparkline values={tempSeries} />
          </div>

          <button
            type="button"
            onClick={exportJson}
            disabled={samples.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {t('growRun.export', 'Экспорт JSON')}
          </button>
        </div>
      )}
    </Modal>
  );
};
