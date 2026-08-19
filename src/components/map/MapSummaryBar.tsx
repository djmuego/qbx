import React from 'react';
import type { SpatialContext } from '../../domain/map/spatial-intelligence.types';
import type { SpaceDimensions } from '../../domain/space/space.types';
import { computeSpaceMetrics } from '../../domain/space/space.types';
import { useLocale } from '../../i18n/LocaleContext';

interface MapSummaryBarProps {
  bounds: SpaceDimensions;
  zoneCount: number;
  plantCount: number;
  sensorCount: number;
  equipmentCount: number;
  spatial?: SpatialContext;
  saveState: 'saved' | 'saving' | 'error';
}

export const MapSummaryBar: React.FC<MapSummaryBarProps> = ({
  bounds,
  zoneCount,
  plantCount,
  sensorCount,
  equipmentCount,
  spatial,
  saveState,
}) => {
  const { t } = useLocale();
  const metrics = computeSpaceMetrics(bounds);
  const recs = spatial?.insights.filter((i) => i.kind === 'placement_recommendation').length ?? 0;
  const saveLabel =
    saveState === 'saving'
      ? t('map.saving', 'Сохранение…')
      : saveState === 'error'
        ? t('map.error', 'Ошибка')
        : t('map.saved', 'Сохранено');

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <span className="font-bold">QBX Map</span>
      <span className="text-slate-500">{metrics.areaM2} м²</span>
      <span>
        {zoneCount} {t('map.summary.zones', 'зон')}
      </span>
      <span>
        {plantCount} {t('map.summary.plants', 'растений')}
      </span>
      <span>
        {sensorCount} {t('map.summary.sensors', 'датчиков')}
      </span>
      <span>
        {equipmentCount} {t('map.summary.equipment', 'приборов')}
      </span>
      <span className="text-slate-500">
        {t('map.summary.coverage', 'Покрытие')}: {spatial?.coverageLabel ?? t('map.insights.coverageUnknown', 'Недостаточно данных')}
      </span>
      {recs > 0 && (
        <span className="text-violet-600 dark:text-violet-300 font-semibold">
          {t('map.summary.recommendations', 'Рекомендации')}: {recs}
        </span>
      )}
      <span className="ml-auto text-[11px] text-slate-400">{saveLabel}</span>
    </div>
  );
};
