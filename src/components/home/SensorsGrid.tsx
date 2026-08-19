import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SensorIcon, ChevronRight, Plus } from '../common/Icons';
import { SensorStatusBadge } from '../common/StatusBadge';
import { PortInput } from '../../types';
import { useLocale } from '../../i18n/LocaleContext';

export const SensorsGrid: React.FC = () => {
  const { allSensorsInCurrentSpace, setSelectedSensor, setIsAddDeviceOpen, tempUnit } = useApp();
  const { t } = useLocale();
  const [showAll, setShowAll] = useState(false);

  // Priority logic: by default show sensors flagged as showOnHome or up to 4
  const prioritySensors = allSensorsInCurrentSpace.filter(item => item.sensor.showOnHome);
  const baseSensors = prioritySensors.length > 0 ? prioritySensors : allSensorsInCurrentSpace.slice(0, 4);

  const displayedSensors = showAll ? allSensorsInCurrentSpace : baseSensors;

  if (allSensorsInCurrentSpace.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
          {t('home.sensorsTitle', 'Климат и датчики')}
        </h2>
        <div className="p-5 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-center bg-white dark:bg-zinc-900 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-zinc-400">{t('home.sensorsEmpty', 'Нет датчиков')}</p>
          <button
            onClick={() => setIsAddDeviceOpen(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors border border-emerald-200/60 dark:border-emerald-800/60"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('home.addSensors', 'Добавить датчики')}
          </button>
        </div>
      </section>
    );
  }

  const formatValue = (sensor: PortInput) => {
    if (!Number.isFinite(sensor.currentValue)) {
      return { val: '—', unit: t('home.noData', 'Нет данных') };
    }
    let val = sensor.currentValue;
    let unit = sensor.unit;

    if (sensor.type === 'temperature' && tempUnit === 'F') {
      val = Number(((val * 9) / 5 + 32).toFixed(1));
      unit = '°F';
    }
    return { val, unit };
  };

  const getSensorColorClass = (type: string) => {
    switch (type) {
      case 'temperature':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60';
      case 'humidity':
        return 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/60';
      case 'soil_moisture':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60';
      case 'co2':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/60';
      case 'ph':
      case 'ec':
        return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60';
      default:
        return 'text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700';
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            {t('home.sensorsTitle', 'Климат и датчики')}
          </h2>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
            ({displayedSensors.length}{!showAll && allSensorsInCurrentSpace.length > displayedSensors.length ? ` из ${allSensorsInCurrentSpace.length}` : ''})
          </span>
        </div>

        {allSensorsInCurrentSpace.length > baseSensors.length && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            {showAll ? t('home.showLess', 'Свернуть') : `${t('home.showAll', 'Показать все')} (${allSensorsInCurrentSpace.length}) →`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {displayedSensors.map(({ device, sensor }) => {
          const { val, unit } = formatValue(sensor);
          const colorClass = getSensorColorClass(sensor.type);

          return (
            <div
              key={sensor.id}
              onClick={() => setSelectedSensor({ device, sensor })}
              className="group relative p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs hover:shadow-md hover:border-emerald-500/60 dark:hover:border-emerald-500/50 active:scale-[0.98] transition-all duration-150 cursor-pointer flex flex-col justify-between overflow-hidden select-none"
            >
              {/* Top row: Icon & Status Badge */}
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className={`p-1.5 rounded-lg transition-all duration-200 ${colorClass}`}>
                  <SensorIcon type={sensor.type} className="w-3.5 h-3.5" />
                </div>
                <SensorStatusBadge status={sensor.status} />
              </div>

              {/* Middle: Title & Big Value */}
              <div className="space-y-0.5 my-0.5">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 line-clamp-1">
                  {sensor.customName}
                </span>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
                    {val}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                    {unit}
                  </span>
                </div>
              </div>

              {/* Bottom: Target range */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                <span className="font-medium text-[11px]">Цель: {sensor.optimalMin}–{sensor.optimalMax} {unit}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
