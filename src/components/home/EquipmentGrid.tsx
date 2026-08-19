import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { EquipmentIcon, Plus, Zap, ChevronRight } from '../common/Icons';
import { OutputControl } from '../equipment/OutputControl';
import { TwinControlStatusBadge } from '../equipment/TwinControlStatusBadge';
import { resolveOutputTwinMode } from '../../domain/equipment/output-twin-mode';
import { resolveOutputControlStatus } from '../../domain/equipment/output-control-status';
import { useLocale } from '../../i18n/LocaleContext';

export const EquipmentGrid: React.FC = () => {
  const {
    allOutputsInCurrentSpace,
    setOutputTwinMode,
    setSelectedEquipment,
    setIsAddDeviceOpen,
    isReadOnly,
    runtimeSnapshot,
    runtimeEvents,
  } = useApp();
  const { t, tv } = useLocale();

  const [filter, setFilter] = useState<'all' | 'active' | 'auto' | 'manual'>('all');

  const filteredOutputs = allOutputsInCurrentSpace.filter(({ output }) => {
    if (filter === 'active') return output.state;
    if (filter === 'auto') return output.isAuto;
    if (filter === 'manual') return !output.isAuto;
    return true;
  });

  const activeCount = allOutputsInCurrentSpace.filter(o => o.output.state).length;
  const manualCount = allOutputsInCurrentSpace.filter(o => !o.output.isAuto).length;

  if (allOutputsInCurrentSpace.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-zinc-800 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-3">
          {t('home.equipmentTitle', 'Оборудование')}
        </h3>
        <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center bg-slate-50/50 dark:bg-zinc-800/30">
          <p className="text-xs text-slate-500 dark:text-zinc-400">{t('home.equipmentEmpty', 'Нет оборудования')}</p>
          {!isReadOnly && (
          <button
            onClick={() => setIsAddDeviceOpen(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200/60 dark:border-emerald-800/60"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('home.addEquipment', 'Добавить оборудование')}
          </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-zinc-800 shadow-xs space-y-3">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            {t('home.equipmentTitle', 'Оборудование')}
          </h3>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
            {tv('home.activeCount', { count: activeCount }, '')}
          </span>
          {manualCount > 0 && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
              {tv('home.manualCount', { count: manualCount }, '')}
            </span>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 p-0.5 rounded-lg self-start sm:self-auto text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all text-xs ${
              filter === 'all'
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
            }`}
          >
            {t('home.filterAll', 'Все')} ({allOutputsInCurrentSpace.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all text-xs ${
              filter === 'active'
                ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
            }`}
          >
            {t('home.filterActive', 'Вкл')} ({activeCount})
          </button>
          <button
            onClick={() => setFilter('auto')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all text-xs ${
              filter === 'auto'
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
            }`}
          >
            {t('home.filterAuto', 'Авто')}
          </button>
          <button
            onClick={() => setFilter('manual')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all text-xs ${
              filter === 'manual'
                ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800'
            }`}
          >
            {t('home.filterManual', 'Ручной')}
          </button>
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {filteredOutputs.map(({ device, output }) => {
          const isActive = output.state;
          const twinMode = resolveOutputTwinMode(output);
          const controlStatus = resolveOutputControlStatus({
            outputId: output.id,
            output,
            runtime: runtimeSnapshot?.outputStates[output.id],
            events: runtimeEvents,
          });

          return (
            <div
              key={output.id}
              onClick={() => setSelectedEquipment({ device, output })}
              className={`group p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                isActive
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/80 shadow-2xs'
                  : 'bg-slate-50/60 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 mb-2">
                <div
                  className={`p-2 rounded-xl shrink-0 transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-zinc-700 text-slate-400 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700'
                  }`}
                >
                  <EquipmentIcon
                    type={output.type}
                    isHighPower={output.isHighPower}
                    className="w-4 h-4"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {output.customName}
                    </h4>
                    {output.isHighPower && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        MAX
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 truncate block">
                    {device.customName} • {output.hardwareLabel}
                  </span>
                </div>
              </div>

              {!isReadOnly && (
                <OutputControl
                  mode={twinMode}
                  onChange={(mode) => setOutputTwinMode(device.id, output.id, mode)}
                  onClick={(e) => e.stopPropagation()}
                  className="mb-2"
                />
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-zinc-800/80 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-zinc-500'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-zinc-600'}`} />
                    {isActive ? t('twinControl.powerOn', 'Включено') : t('twinControl.powerOff', 'Выключено')}
                  </span>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <TwinControlStatusBadge status={controlStatus} />
                  {controlStatus === 'rule' && output.activeAutomationName && (
                    <span className="text-[10px] font-medium text-sky-700 dark:text-sky-300 truncate max-w-[120px]">
                      {output.activeAutomationName}
                    </span>
                  )}
                </div>

                <span className="text-slate-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-semibold flex items-center transition-colors">
                  {t('common.details', 'Детали')} <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
