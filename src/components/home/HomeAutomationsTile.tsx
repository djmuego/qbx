import React from 'react';
import { useApp } from '../../context/AppContext';
import { Zap, Sun, Droplets, Wind, Plus, ChevronRight, Clock } from '../common/Icons';
import { useLocale } from '../../i18n/LocaleContext';

export const HomeAutomationsTile: React.FC = () => {
  const { currentSpaceAutomations, toggleAutomation, setCurrentTab, setIsAddAutomationOpen, isReadOnly } = useApp();
  const { t, tv } = useLocale();

  const getIcon = (type: string, name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('свет') || lower.includes('освещ')) return <Sun className="w-4 h-4 text-amber-500" />;
    if (lower.includes('полив') || lower.includes('влажн')) return <Droplets className="w-4 h-4 text-sky-500" />;
    if (lower.includes('вентил') || lower.includes('co2') || lower.includes('обдув')) return <Wind className="w-4 h-4 text-purple-500" />;
    return <Zap className="w-4 h-4 text-emerald-500" />;
  };

  const activeAutomations = currentSpaceAutomations.slice(0, 4);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200/90 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t('automations.title', 'Автоматизации')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {tv('home.automationsActive', {
              active: currentSpaceAutomations.filter(a => a.isEnabled).length,
              total: currentSpaceAutomations.length,
            }, '')}
          </p>
        </div>

        <button
          onClick={() => setCurrentTab('automations')}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-0.5"
        >
          {tv('home.automationsAll', { count: currentSpaceAutomations.length }, '')}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List */}
      {currentSpaceAutomations.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/30">
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {t('home.automationsNoRules', 'Нет правил')}
          </p>
          {!isReadOnly && (
          <button
            onClick={() => setIsAddAutomationOpen(true)}
            className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            + {t('home.automationsCreate', 'Создать автоматизацию')}
          </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 flex-1">
          {activeAutomations.map(auto => {
            let triggerText = '';
            if (auto.type === 'schedule') {
              triggerText = `${auto.onTime || '07:00'} → Вкл / ${auto.offTime || '21:00'} → Выкл`;
            } else if (auto.type === 'sensor') {
              triggerText = `${auto.sensorName || 'Датчик'} ${auto.condition === 'below' ? '<' : '>'} ${auto.threshold}${auto.thresholdUnit || ''}`;
            } else {
              triggerText = `Каждые ${auto.intervalMinutes || 60} мин на ${auto.durationSeconds || 30} сек`;
            }

            return (
              <div
                key={auto.id}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 transition-all hover:bg-slate-100/70 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-700/60 shadow-2xs shrink-0">
                    {getIcon(auto.type, auto.name)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">
                      {auto.name}
                      {auto.runtimeStatus === 'running' && (
                        <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ON
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                      {triggerText}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => toggleAutomation(auto.id)}
                  className={`w-10 h-6 rounded-full transition-colors relative p-0.5 shrink-0 focus:outline-none ${
                    auto.isEnabled
                      ? 'bg-emerald-600'
                      : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                  aria-label={auto.isEnabled ? 'Выключить правило' : 'Включить правило'}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                      auto.isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Add button */}
      {!isReadOnly && (
      <button
        onClick={() => setIsAddAutomationOpen(true)}
        className="mt-3 w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all flex items-center justify-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" />
        Добавить сценарий
      </button>
      )}
    </div>
  );
};
