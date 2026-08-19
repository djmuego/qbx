import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import {
  Plus,
  Zap,
  Clock,
  Timer,
  Trash2,
} from '../common/Icons';
import { AutomationTriggerType } from '../../types';

export const AutomationsList: React.FC = () => {
  const {
    currentSpaceAutomations,
    toggleAutomation,
    deleteAutomation,
    setIsAddAutomationOpen,
    currentSpace,
    isReadOnly,
  } = useApp();
  const { t, tv } = useLocale();

  const [filter, setFilter] = useState<'all' | AutomationTriggerType>('all');

  const filteredAutomations = currentSpaceAutomations.filter(auto => {
    if (filter === 'all') return true;
    return auto.type === filter;
  });

  const getTriggerIcon = (type: AutomationTriggerType) => {
    switch (type) {
      case 'sensor':
        return <Zap className="w-3.5 h-3.5 text-emerald-500" />;
      case 'schedule':
        return <Clock className="w-3.5 h-3.5 text-sky-500" />;
      case 'timer':
        return <Timer className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const getTriggerTypeLabel = (type: AutomationTriggerType) => {
    switch (type) {
      case 'sensor':
        return t('automations.triggerSensor', 'По датчику');
      case 'schedule':
        return t('automations.triggerSchedule', 'По расписанию');
      case 'timer':
        return t('automations.triggerTimer', 'Циклический таймер');
    }
  };

  const getRuntimeStatusLabel = (status?: string) => {
    switch (status) {
      case 'running':
        return 'running';
      case 'error':
        return 'error';
      case 'disabled':
        return 'disabled';
      default:
        return 'waiting';
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('automations.title', 'Автоматизации')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            {tv('automations.subtitle', { space: currentSpace?.name || '—' }, '')}
          </p>
        </div>

        {!isReadOnly && (
        <button
          onClick={() => setIsAddAutomationOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-2xs transition-all w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>{t('automations.create', 'Создать автоматизацию')}</span>
        </button>
        )}
      </div>

      {/* Filters */}
      {currentSpaceAutomations.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-zinc-800 text-slate-600 hover:bg-slate-100 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700'
            }`}
          >
            Все ({currentSpaceAutomations.length})
          </button>
          <button
            onClick={() => setFilter('sensor')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filter === 'sensor'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-zinc-800 text-slate-600 hover:bg-slate-100 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700'
            }`}
          >
            По датчику
          </button>
          <button
            onClick={() => setFilter('schedule')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filter === 'schedule'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-zinc-800 text-slate-600 hover:bg-slate-100 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700'
            }`}
          >
            По расписанию
          </button>
          <button
            onClick={() => setFilter('timer')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filter === 'timer'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-zinc-800 text-slate-600 hover:bg-slate-100 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700'
            }`}
          >
            Таймеры
          </button>
        </div>
      )}

      {/* Empty State */}
      {currentSpaceAutomations.length === 0 ? (
        <div className="py-14 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-center bg-white dark:bg-zinc-900 shadow-xs max-w-lg mx-auto my-6">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Пока нет автоматизаций
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
            Создайте первое правило, и QBX возьмёт поддержание климата и полив на себя.
          </p>
          <button
            onClick={() => setIsAddAutomationOpen(true)}
            className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            Создать автоматизацию
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filteredAutomations.map(auto => {
            const status = getRuntimeStatusLabel(auto.runtimeStatus);
            const runningNow = status === 'running';
            const hasError = status === 'error';

            return (
              <div
                key={auto.id}
                className={`p-4 sm:p-4.5 rounded-2xl border transition-all flex flex-col justify-between select-none ${
                  runningNow
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                    : hasError
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 shadow-xs'
                    : auto.isEnabled
                    ? 'bg-white dark:bg-zinc-900 border-slate-200/90 dark:border-zinc-800 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-zinc-900/40 border-slate-200/60 dark:border-zinc-800/60 opacity-75'
                }`}
              >
                <div>
                  {/* Top row: Trigger pill + Switch */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                      {getTriggerIcon(auto.type)}
                      <span>{getTriggerTypeLabel(auto.type)}</span>
                    </div>

                    {/* Enable toggle switch */}
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

                  {/* Title */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {auto.name}
                  </h3>

                  {/* Human-readable conditions */}
                  <div className="mt-2.5 space-y-1 text-xs">
                    <div className="flex items-baseline gap-2">
                      <span className="text-slate-400 dark:text-zinc-500 font-semibold w-16 shrink-0">
                        Когда:
                      </span>
                      <span className="text-slate-700 dark:text-zinc-200 font-medium">
                        {auto.type === 'sensor' && (
                          <>
                            {auto.sensorName || 'Датчик'}{' '}
                            {auto.condition === 'below' ? 'ниже' : 'выше'}{' '}
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {auto.threshold}{auto.thresholdUnit}
                            </span>
                          </>
                        )}
                        {auto.type === 'schedule' && (
                          <>
                            Включение в{' '}
                            <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">
                              {auto.onTime}
                            </span>
                          </>
                        )}
                        {auto.type === 'timer' && (
                          <>
                            Каждые{' '}
                            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                              {auto.intervalMinutes} мин
                            </span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-slate-400 dark:text-zinc-500 font-semibold w-16 shrink-0">
                        Действие:
                      </span>
                      <span className="text-slate-800 dark:text-zinc-100 font-semibold">
                        {auto.actionType === 'turn_on' ? 'Включить' : 'Выключить'}{' '}
                        <span className="text-slate-900 dark:text-white underline decoration-emerald-500/40">
                          {auto.equipmentName}
                        </span>
                      </span>
                    </div>

                    {(auto.stopThreshold !== undefined || auto.offTime || auto.durationSeconds) && (
                      <div className="flex items-baseline gap-2 text-slate-500 dark:text-zinc-400">
                        <span className="text-slate-400 dark:text-zinc-500 font-semibold w-16 shrink-0">
                          Остановить:
                        </span>
                        <span>
                          {auto.type === 'sensor' && auto.stopThreshold !== undefined && (
                            <>
                              при достижении{' '}
                              <span className="font-semibold text-slate-700 dark:text-zinc-200 font-mono">
                                {auto.stopThreshold}{auto.thresholdUnit}
                              </span>
                            </>
                          )}
                          {auto.type === 'schedule' && auto.offTime && (
                            <>
                              в{' '}
                              <span className="font-semibold text-slate-700 dark:text-zinc-200 font-mono">
                                {auto.offTime}
                              </span>
                            </>
                          )}
                          {auto.type === 'timer' && auto.durationSeconds && (
                            <>
                              через{' '}
                              <span className="font-semibold text-slate-700 dark:text-zinc-200 font-mono">
                                {auto.durationSeconds} сек
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: State status badge (Running vs Active vs Disabled) & Actions */}
                <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 text-xs">
                  <div>
                    {runningNow ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Выполняется сейчас
                      </span>
                    ) : hasError ? (
                      <span className="text-rose-600 dark:text-rose-400 text-[11px] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Ошибка (датчик недоступен)
                      </span>
                    ) : auto.isEnabled ? (
                      <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Активно (ожидает условия)
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-600 text-[11px]">
                        Выключено
                      </span>
                    )}
                  </div>

                  {!isReadOnly && (
                  <button
                    onClick={() => deleteAutomation(auto.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Удалить правило"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
