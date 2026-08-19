import React from 'react';
import type { HeatmapResult } from '../../domain/map/spatial-intelligence.types';
import { useLocale } from '../../i18n/LocaleContext';
import { heatmapLegendLabels, heatmapLegendStops } from './MapHeatmapLayer';
import { heatmapValueRange } from '../../application/intelligence/heatmap-interpolation';

export type HeatmapMetricOption = 'off' | 'temperature' | 'humidity';

interface MapHeatmapBarProps {
  metric: HeatmapMetricOption;
  onMetricChange: (metric: HeatmapMetricOption) => void;
  heatmap: HeatmapResult | null;
}

export const MapHeatmapBar: React.FC<MapHeatmapBarProps> = ({ metric, onMetricChange, heatmap }) => {
  const { t } = useLocale();
  const options: { id: HeatmapMetricOption; label: string }[] = [
    { id: 'off', label: t('map.heatmap.off', 'Выкл') },
    { id: 'temperature', label: t('map.heatmap.temperature', 'T°C') },
    { id: 'humidity', label: t('map.heatmap.humidity', 'RH%') },
  ];

  const range = heatmap?.available && heatmap.metric !== 'vpd' ? heatmapValueRange(heatmap.measured) : null;
  const legend =
    range && heatmap?.available && heatmap.metric !== 'vpd'
      ? heatmapLegendStops(heatmap.metric, range.min, range.max)
      : null;
  const labels =
    range && heatmap?.available && heatmap.metric !== 'vpd'
      ? heatmapLegendLabels(heatmap.metric, range.min, range.max)
      : null;

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
          {t('map.heatmap.title', 'Теплокарта')}
        </span>
        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-zinc-800 p-0.5">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onMetricChange(opt.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                metric === opt.id
                  ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {metric !== 'off' && heatmap && !heatmap.available && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex-1">
          {heatmap.reason ?? t('map.heatmap.unavailable', 'Недостаточно live-датчиков на карте.')}
        </p>
      )}

      {metric !== 'off' && heatmap?.available && legend && labels && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="h-2.5 flex-1 max-w-[180px] rounded-full overflow-hidden border border-slate-200 dark:border-zinc-700"
            style={{ background: `linear-gradient(90deg, ${legend.join(', ')})` }}
          />
          <div className="flex justify-between gap-2 text-[10px] text-slate-500 font-mono min-w-[120px]">
            <span>{labels[0]}</span>
            <span>{labels[2]}</span>
          </div>
          <p className="hidden lg:block text-[10px] text-slate-400 max-w-[220px] truncate">
            {heatmap.interpolationNote ?? t('map.heatmap.interpolated', 'Интерполяция между точками')}
          </p>
        </div>
      )}
    </div>
  );
};
