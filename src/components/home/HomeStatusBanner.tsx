import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import { CheckCircle2, AlertTriangle, ChevronRight, ShieldAlert, Plus } from '../common/Icons';
import { isSimulatorMode } from '../../config/runtime-mode';

export const HomeStatusBanner: React.FC = () => {
  const {
    devices,
    currentSpace,
    currentSpaceDevices,
    allSensorsInCurrentSpace,
    allOutputsInCurrentSpace,
    setSelectedSensor,
    setIsEmergencyModalOpen,
    openAddDevice,
    isEmergencyActive,
    releaseEmergency,
    setCurrentTab,
    setSpatialFocus,
    currentSpaceMap,
    resetToDefault,
    isReadOnly,
  } = useApp();
  const { t } = useLocale();

  const hasDevices = devices.length > 0;
  const hasSpaceDevices = currentSpaceDevices.length > 0;
  const onlineDevicesCount = currentSpaceDevices.filter((d) => d.isOnline).length;
  const activeOutputsCount = allOutputsInCurrentSpace.filter((o) => o.output.state).length;

  if (!hasDevices) {
    return (
      <div className="h-full rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col justify-center gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{t('home.readyTitle', 'QBX готов к работе')}</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {isSimulatorMode() ? t('home.readySim', '') : t('home.readyHardware', '')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openAddDevice()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            {t('home.addDevice', 'Добавить устройство')}
          </button>
          {isSimulatorMode() && !isReadOnly && (
            <button
              onClick={() => resetToDefault()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-xl border border-sky-200/70 dark:border-sky-800/60"
            >
              {t('twinControl.loadDemoData', 'Загрузить демо-данные')}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (currentSpace && !hasSpaceDevices) {
    return (
      <div className="h-full rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col justify-center gap-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{currentSpace.name}</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400">0 устройств · Добавьте первое устройство QBX</p>
        {currentSpace.areaM2 != null && (
          <p className="text-[11px] text-slate-400 dark:text-zinc-500">
            {currentSpace.areaM2} м² · {currentSpace.volumeM3} м³
          </p>
        )}
        <button
          onClick={() => openAddDevice()}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          Добавить устройство
        </button>
      </div>
    );
  }

  const issueSensors = allSensorsInCurrentSpace.filter(
    (s) => s.sensor.status === 'low' || s.sensor.status === 'high' || s.sensor.status === 'attention',
  );
  const firstIssue = issueSensors[0];
  const firstOffline = currentSpaceDevices.find((d) => !d.isOnline);
  const hasIssues = Boolean(firstIssue) && !isEmergencyActive;

  const getIssueDescription = () => {
    if (!firstIssue) return '';
    const statusText = firstIssue.sensor.status === 'low' ? 'ниже нормы' : 'выше нормы';
    const value = Number.isFinite(firstIssue.sensor.currentValue)
      ? `${firstIssue.sensor.currentValue}${firstIssue.sensor.unit}`
      : 'Нет данных';
    return `${firstIssue.sensor.customName} ${statusText} · ${value}`;
  };

  return (
    <div className="h-full rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isEmergencyActive
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : hasIssues
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {isEmergencyActive ? (
              <ShieldAlert className="w-5 h-5" />
            ) : hasIssues ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {isEmergencyActive ? 'Экстренное отключение' : hasIssues ? 'Требует внимания' : 'Всё в порядке'}
              </h2>
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-300 mt-0.5">
              {isEmergencyActive
                ? 'Автоматика заблокирована. Все выходы выключены.'
                : hasIssues
                  ? getIssueDescription()
                  : onlineDevicesCount > 0
                    ? isSimulatorMode()
                      ? 'Симулятор: все системы работают нормально'
                      : 'Все системы работают нормально'
                    : 'Ожидание данных от устройств'}
            </p>
            {firstOffline && currentSpace && currentSpaceMap && (
              <button
                type="button"
                className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                onClick={() => {
                  setSpatialFocus({ spaceId: currentSpace.id, deviceId: firstOffline.id, reason: 'offline' });
                  setCurrentTab('map');
                }}
              >
                Показать на карте
              </button>
            )}
          </div>
        </div>

        {hasIssues && firstIssue && (
          <button
            onClick={() => setSelectedSensor({ device: firstIssue.device, sensor: firstIssue.sensor })}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200/80"
          >
            <span>Посмотреть</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span>
            {onlineDevicesCount > 0
              ? `${onlineDevicesCount} в сети`
              : `${currentSpaceDevices.length} не подключено`}
          </span>
          <span className="text-slate-300 dark:text-zinc-700">•</span>
          <span>{activeOutputsCount} вкл</span>
        </div>

        {isEmergencyActive ? (
          <button
            onClick={() => releaseEmergency()}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
          >
            Возобновить автоматику
          </button>
        ) : (
          <button
            onClick={() => setIsEmergencyModalOpen(true)}
            disabled={allOutputsInCurrentSpace.length === 0}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Выключить всё</span>
          </button>
        )}
      </div>
    </div>
  );
};
