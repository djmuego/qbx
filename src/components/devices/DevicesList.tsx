import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import {
  Plus,
  Cpu,
  ChevronRight,
} from '../common/Icons';
import { ProductStorefront } from './ProductStorefront';

export const DevicesList: React.FC = () => {
  const {
    devices,
    currentSpaceId,
    currentSpace,
    spaces,
    setSelectedDeviceDetail,
    openAddDevice,
    assignDeviceToSpace,
    isReadOnly,
  } = useApp();
  const { t, tv } = useLocale();

  const spaceDevices = devices.filter((d) => d.spaceId === currentSpaceId);
  const otherSpaceDevices = devices.filter((d) => d.spaceId !== currentSpaceId);
  const onlineCount = spaceDevices.filter((d) => d.isOnline).length;
  const spaceName = currentSpace?.name || '—';

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      <ProductStorefront onAddModel={(id) => openAddDevice(id)} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('devices.list.title', 'Устройства')}
            </h1>
            {spaceDevices.length > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                {tv(
                  'devices.list.modulesOnline',
                  { count: spaceDevices.length, online: onlineCount },
                  `${spaceDevices.length} модулей · ${onlineCount} в сети`,
                )}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            {tv('devices.list.subtitle', { space: spaceName }, `Пространство «${spaceName}»`)}
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => openAddDevice()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-2xs transition-all w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>{t('devices.list.add', 'Добавить устройство')}</span>
          </button>
        )}
      </div>

      {spaceDevices.length === 0 ? (
        <div className="py-14 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-center bg-white dark:bg-zinc-900 shadow-xs max-w-lg mx-auto my-6">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {t('devices.list.emptyTitle', 'В этом пространстве нет устройств')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
            {t('devices.list.emptyHint', '')}
          </p>
          {!isReadOnly && (
            <button
              onClick={() => openAddDevice('qbx-strip-4')}
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('devices.list.add', 'Добавить устройство')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {spaceDevices.map((device) => {
            const usedInputs = device.inputs.filter((i) => i.type !== 'unused');
            const usedOutputs = device.outputs.filter((o) => o.type !== 'unused');
            const hasHighPower = device.outputs.some((o) => o.isHighPower);

            return (
              <div
                key={device.id}
                onClick={() => setSelectedDeviceDetail(device)}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/50 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between select-none"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                      {device.modelName}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{device.isOnline ? t('common.online', 'В сети') : t('common.offline', 'Не в сети')}</span>
                    </div>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {device.customName}
                  </h3>
                  <div className="mt-2.5 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>{t('devices.list.inputs', 'Входы для датчиков')}</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {device.inputs.length === 0
                          ? t('common.none', 'Нет')
                          : `${usedInputs.length} / ${device.inputs.length}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t('devices.list.outputs', 'Силовые выходы')}</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {device.outputs.length === 0
                          ? t('common.none', 'Нет')
                          : `${usedOutputs.length} / ${device.outputs.length}`}
                        {hasHighPower && ' (16A MAX)'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-1.5">
                      {t('devices.list.connected', 'Подключено')}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {usedInputs.slice(0, 2).map((i) => (
                        <span
                          key={i.id}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                        >
                          {i.customName}
                        </span>
                      ))}
                      {usedOutputs.slice(0, 2).map((o) => (
                        <span
                          key={o.id}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                        >
                          {o.customName}
                        </span>
                      ))}
                      {usedInputs.length + usedOutputs.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-400">
                          +{usedInputs.length + usedOutputs.length - 4}
                        </span>
                      )}
                      {usedInputs.length === 0 && usedOutputs.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">{t('devices.list.portsFree', '')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3.5 pt-2.5 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-t border-slate-100 dark:border-zinc-800/80">
                  <span>{t('devices.list.configure', 'Настроить подключения')}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isReadOnly && otherSpaceDevices.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-zinc-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            {t('devices.list.otherSpaces', 'Устройства в других пространствах')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
            {tv('devices.list.moveHint', { space: spaceName }, '')}
          </p>
          <div className="space-y-2">
            {otherSpaceDevices.map((device) => {
              const otherSpaceName = spaces.find((s) => s.id === device.spaceId)?.name ?? '—';
              return (
                <div
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDeviceDetail(device)}
                    className="text-left min-w-0 flex-1"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{device.customName}</div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">
                      {device.modelName} · {otherSpaceName}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => assignDeviceToSpace(device.id, currentSpaceId)}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60"
                  >
                    {t('devices.list.moveHere', 'Переместить сюда')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
